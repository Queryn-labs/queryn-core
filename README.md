# queryn-core

Общие TypeScript-пакеты для папок проекта Queryn.
Каноническая [страница документации](https://github.com/Queryn-labs/queryn-docs) описывает продуктовые и архитектурные контракты, которые реализуются здесь.

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

- `@queryn/types`: общие доменные типы.
- `@queryn/manifest`: создание и чтение manifest.
- `@queryn/validation`: валидация manifest и структуры проекта.
- `@queryn/project`: создание и открытие папки проекта, операции с конспектами.

Границы пакетов должны оставаться небольшими.

Стабильные доменные контракты размещаются в `@queryn/types`, операции с
диском — в `@queryn/project`, manifest-specific логика — в
`@queryn/manifest`, проверки — в `@queryn/validation`. Core не владеет
desktop UI, runtime orchestration или host-средой расширений.

## Связанные репозитории

- `queryn-spec` определяет формат проекта, реализуемый здесь.
- `queryn-desktop` использует project и validation APIs.
- `queryn-sdk` может переиспользовать общие типы для plugin APIs.
- `queryn-runtime` использует core для project IO и доменных операций.
- `queryn-docs` содержит нормативное описание поведения и архитектуры.

## Лицензия

MIT.
