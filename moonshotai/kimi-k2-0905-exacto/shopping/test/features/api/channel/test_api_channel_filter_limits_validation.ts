import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

export async function test_api_channel_filter_limits_validation(
  connection: api.IConnection,
) {
  // Test default values work
  const defaultResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {} satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(defaultResult);

  // Test pagination boundary conditions
  const validLimit = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  TestValidator.equals("valid limit returned", validLimit.data.length, 20);

  // Test limit at maximum boundary
  const maxLimitResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "max limit result valid",
    maxLimitResult.data.length <= 100,
  );

  // Test valid sort fields
  const sortFields = [
    "name",
    "code",
    "commissionRate",
    "createdAt",
    "updatedAt",
  ] as const;
  const sortField = RandomGenerator.pick(sortFields);
  const sortedResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        sortBy: sortField,
        sortOrder: RandomGenerator.pick(["asc", "desc"] as const),
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(sortedResult);

  // Test search with maximum length
  const maxSearch = RandomGenerator.alphabets(100);
  const searchResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        search: maxSearch,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(searchResult);

  // Test currency code format validation
  const validCurrency = RandomGenerator.pick([
    "USD",
    "EUR",
    "KRW",
    "JPY",
    "CNY",
  ] as const);
  const currencyResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        currencyCode: validCurrency,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(currencyResult);

  // Test language code format validation
  const validLanguage = RandomGenerator.pick([
    "en",
    "ko",
    "ja",
    "zh",
    "es",
  ] as const);
  const languageResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        language: validLanguage,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(languageResult);

  // Test max language code length
  const maxLang = RandomGenerator.alphabets(10);
  const maxLangResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        language: maxLang,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(maxLangResult);

  // Test code filter validation
  const codeFilter = RandomGenerator.alphabets(50);
  const codeResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        code: codeFilter,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(codeResult);

  // Test boolean filter
  const isActiveResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        isActive: true,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(isActiveResult);

  const isInactiveResult = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: {
        isActive: false,
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(isInactiveResult);
}
