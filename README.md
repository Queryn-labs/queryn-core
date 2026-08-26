# osnova-core

Общие TypeScript-пакеты для папок проекта Osnova.
Каноническая [страница документации](https://github.com/Queryn-labs/osnova-docs) описывает продуктовые и архитектурные контракты, которые реализуются здесь.

## Статус

Стабильный набор из четырёх пакетов версии `0.2.0` для доменных типов,
манифеста, валидации и операций с папкой проекта. Репозиторий содержит тесты
общего поведения.

## Stack

- TypeScript
- pnpm 10.5.2
- Vitest

## Команды

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```

## Границы

Четыре пакета репозитория:

- `@osnova/types`: общие доменные типы.
- `@osnova/manifest`: создание и чтение manifest.
- `@osnova/validation`: валидация manifest и структуры проекта.
- `@osnova/project`: создание и открытие папки проекта, операции с конспектами.

Границы пакетов должны оставаться небольшими.

Стабильные доменные контракты размещаются в `@osnova/types`, операции с
диском — в `@osnova/project`, manifest-specific логика — в
`@osnova/manifest`, проверки — в `@osnova/validation`. Core не владеет
desktop UI, runtime orchestration или host-средой расширений.

## Связанные репозитории

- `osnova-spec` определяет формат проекта, реализуемый здесь.
- `osnova-desktop` использует project и validation APIs.
- `osnova-plugin-sdk` может переиспользовать общие типы для plugin APIs.
- `osnova-runtime` использует core для project IO и доменных операций.
- `osnova-docs` содержит нормативное описание поведения и архитектуры.

## Лицензия

MIT.
