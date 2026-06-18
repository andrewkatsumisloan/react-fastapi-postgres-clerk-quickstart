PYTHON ?= python3
COMPOSE ?= docker compose

.PHONY: help dev test test-server lint-client build-client migrate compose-config compose-prod-config

help:
	@printf '%s\n' \
		'dev                 Start client, API, and Postgres with Docker Compose' \
		'test                Run backend tests and frontend lint/build' \
		'test-server         Run backend unit tests' \
		'lint-client         Run frontend lint' \
		'build-client        Build frontend assets' \
		'migrate             Run Alembic migrations locally from server/' \
		'compose-config      Validate development Compose config' \
		'compose-prod-config Validate production Compose config using current env'

dev:
	$(COMPOSE) up --build

test: test-server lint-client build-client

test-server:
	cd server && $(PYTHON) -m unittest discover -s tests

lint-client:
	cd client && npm run lint

build-client:
	cd client && npm run build

migrate:
	cd server && alembic upgrade head

compose-config:
	$(COMPOSE) config --quiet

compose-prod-config:
	$(COMPOSE) -f docker-compose.prod.yml config --quiet
