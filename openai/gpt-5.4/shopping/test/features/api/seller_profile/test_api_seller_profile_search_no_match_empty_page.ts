import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_search_no_match_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const storefrontConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const impossibleToken = `no-match-${RandomGenerator.alphaNumeric(24)}-${RandomGenerator.alphaNumeric(24)}`;
  const request = {
    search: impossibleToken,
    shop_name: impossibleToken,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSellerProfile.IRequest;
  const first = await api.functional.shoppingMall.seller_profiles.index(
    storefrontConnection,
    {
      body: request,
    },
  );
  typia.assert(first);
  TestValidator.equals("first search returns empty data", first.data.length, 0);
  TestValidator.equals(
    "first pagination current matches request",
    first.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "first pagination limit matches request",
    first.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "first pagination records is zero",
    first.pagination.records,
    0,
  );
  TestValidator.equals(
    "first pagination pages is zero",
    first.pagination.pages,
    0,
  );
  const second = await api.functional.shoppingMall.seller_profiles.index(
    storefrontConnection,
    {
      body: request,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "second search returns empty data",
    second.data.length,
    0,
  );
  TestValidator.equals(
    "second pagination current matches request",
    second.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "second pagination limit matches request",
    second.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "second pagination records is zero",
    second.pagination.records,
    0,
  );
  TestValidator.equals(
    "second pagination pages is zero",
    second.pagination.pages,
    0,
  );
  TestValidator.equals(
    "repeated empty search data remains stable",
    second.data,
    first.data,
  );
  TestValidator.equals(
    "repeated empty search pagination remains stable",
    second.pagination,
    first.pagination,
  );
}
