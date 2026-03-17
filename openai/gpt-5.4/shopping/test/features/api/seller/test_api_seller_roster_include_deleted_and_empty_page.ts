import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_roster_include_deleted_and_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const sellerRosterConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const defaultRequest = {
    page: 1,
    limit: 100,
    sort: "created_at",
  } satisfies IShoppingMallSeller.IRequest;
  const defaultPage = await api.functional.shoppingMall.sellers.index(
    sellerRosterConnection,
    {
      body: defaultRequest,
    },
  );
  typia.assert<IPageIShoppingMallSeller.ISummary>(defaultPage);
  TestValidator.equals(
    "default page current pagination reflects request",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default page limit pagination reflects request",
    defaultPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "default page data length does not exceed pagination limit",
    defaultPage.data.length <= defaultPage.pagination.limit,
  );
  const defaultIds = defaultPage.data.map((seller) => seller.id);
  TestValidator.equals(
    "default page has no duplicate seller rows",
    new Set(defaultIds).size,
    defaultIds.length,
  );
  for (const seller of defaultPage.data) {
    TestValidator.equals(
      "default query excludes soft-deleted sellers",
      seller.deleted_at,
      null,
    );
  }
  const includeDeletedRequest = {
    page: 1,
    limit: 100,
    sort: "created_at",
    includeDeleted: true,
  } satisfies IShoppingMallSeller.IRequest;
  const includeDeletedPage = await api.functional.shoppingMall.sellers.index(
    sellerRosterConnection,
    {
      body: includeDeletedRequest,
    },
  );
  typia.assert<IPageIShoppingMallSeller.ISummary>(includeDeletedPage);
  TestValidator.equals(
    "includeDeleted page current pagination reflects request",
    includeDeletedPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "includeDeleted page limit pagination reflects request",
    includeDeletedPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "includeDeleted page data length does not exceed pagination limit",
    includeDeletedPage.data.length <= includeDeletedPage.pagination.limit,
  );
  const includeDeletedIds = includeDeletedPage.data.map((seller) => seller.id);
  TestValidator.equals(
    "includeDeleted page has no duplicate seller rows",
    new Set(includeDeletedIds).size,
    includeDeletedIds.length,
  );
  const activeSellerCount = includeDeletedPage.data.filter(
    (seller) => seller.deleted_at === null,
  ).length;
  const deletedSellerCount = includeDeletedPage.data.filter(
    (seller) => seller.deleted_at !== null,
  ).length;
  TestValidator.equals(
    "includeDeleted page partitions active and deleted sellers without overlap",
    activeSellerCount + deletedSellerCount,
    includeDeletedPage.data.length,
  );
  for (const seller of includeDeletedPage.data.filter(
    (elem) => elem.deleted_at === null,
  )) {
    TestValidator.equals(
      "active sellers keep null deleted_at when includeDeleted is true",
      seller.deleted_at,
      null,
    );
  }
  const emptySearchToken = `__autobe_no_match_${RandomGenerator.alphaNumeric(16)}_${RandomGenerator.alphaNumeric(16)}__`;
  const emptyRequest = {
    search: emptySearchToken,
    includeDeleted: true,
    page: 1,
    limit: 10,
    sort: "created_at",
  } satisfies IShoppingMallSeller.IRequest;
  const emptyPage = await api.functional.shoppingMall.sellers.index(
    sellerRosterConnection,
    {
      body: emptyRequest,
    },
  );
  typia.assert<IPageIShoppingMallSeller.ISummary>(emptyPage);
  TestValidator.equals("empty page data length", emptyPage.data.length, 0);
  TestValidator.equals(
    "empty page current pagination reflects request",
    emptyPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty page limit pagination reflects request",
    emptyPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty page records pagination is zero",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty page pages pagination is zero",
    emptyPage.pagination.pages,
    0,
  );
}
