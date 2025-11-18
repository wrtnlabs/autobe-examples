import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingMethod";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

export async function test_api_admin_shipping_methods_search_with_text_filter(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional and nullable; we can omit it entirely for this test
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create two distinct shipping methods: Method A and Method B
  // Method A - "standard_domestic"
  const methodACreateBody = {
    method_code: "standard_domestic",
    display_name: "Standard Domestic Shipping",
    service_level_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  const methodA: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: methodACreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(methodA);

  // Method B - "express_international"
  const methodBCreateBody = {
    method_code: "express_international",
    display_name: "Express International Shipping",
    service_level_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  const methodB: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: methodBCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(methodB);

  // 3. Search with a term that should match only Method A
  const searchTermForA = "Domestic";
  const searchARequestBody = {
    page: 0,
    limit: 10,
    search: searchTermForA,
  } satisfies IShoppingMallShippingMethod.IRequest;

  const pageForA: IPageIShoppingMallShippingMethod.ISummary =
    await api.functional.shoppingMall.admin.shippingMethods.index(connection, {
      body: searchARequestBody,
    });
  typia.assert<IPageIShoppingMallShippingMethod.ISummary>(pageForA);

  const paginationA = pageForA.pagination;
  const dataA = pageForA.data;

  TestValidator.equals(
    "search Domestic should return exactly one record",
    paginationA.records,
    1,
  );
  TestValidator.equals(
    "search Domestic data length should be 1",
    dataA.length,
    1,
  );

  const summaryA = dataA[0];
  TestValidator.equals(
    "search Domestic result method_code matches Method A",
    summaryA.method_code,
    methodA.method_code,
  );
  TestValidator.equals(
    "search Domestic result display_name matches Method A",
    summaryA.display_name,
    methodA.display_name,
  );
  TestValidator.notEquals(
    "search Domestic result should not match Method B method_code",
    summaryA.method_code,
    methodB.method_code,
  );

  // 4. Search with a term that should match only Method B
  const searchTermForB = "International";
  const searchBRequestBody = {
    page: 0,
    limit: 10,
    search: searchTermForB,
  } satisfies IShoppingMallShippingMethod.IRequest;

  const pageForB: IPageIShoppingMallShippingMethod.ISummary =
    await api.functional.shoppingMall.admin.shippingMethods.index(connection, {
      body: searchBRequestBody,
    });
  typia.assert<IPageIShoppingMallShippingMethod.ISummary>(pageForB);

  const paginationB = pageForB.pagination;
  const dataB = pageForB.data;

  TestValidator.equals(
    "search International should return exactly one record",
    paginationB.records,
    1,
  );
  TestValidator.equals(
    "search International data length should be 1",
    dataB.length,
    1,
  );

  const summaryB = dataB[0];
  TestValidator.equals(
    "search International result method_code matches Method B",
    summaryB.method_code,
    methodB.method_code,
  );
  TestValidator.equals(
    "search International result display_name matches Method B",
    summaryB.display_name,
    methodB.display_name,
  );
  TestValidator.notEquals(
    "search International result should not match Method A method_code",
    summaryB.method_code,
    methodA.method_code,
  );

  // 5. Search with a term that matches neither method
  const searchTermForNone = "NonExistingPhraseForSearchFilter";
  const searchNoneRequestBody = {
    page: 0,
    limit: 10,
    search: searchTermForNone,
  } satisfies IShoppingMallShippingMethod.IRequest;

  const pageForNone: IPageIShoppingMallShippingMethod.ISummary =
    await api.functional.shoppingMall.admin.shippingMethods.index(connection, {
      body: searchNoneRequestBody,
    });
  typia.assert<IPageIShoppingMallShippingMethod.ISummary>(pageForNone);

  const paginationNone = pageForNone.pagination;
  const dataNone = pageForNone.data;

  TestValidator.equals(
    "search with non-matching term should return zero records",
    paginationNone.records,
    0,
  );
  TestValidator.equals(
    "search with non-matching term data length should be 0",
    dataNone.length,
    0,
  );
}
