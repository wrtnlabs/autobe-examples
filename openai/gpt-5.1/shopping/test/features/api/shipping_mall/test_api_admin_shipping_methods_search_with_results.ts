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

/**
 * Validate that an authenticated admin can search and paginate shipping methods
 * when at least one method exists.
 *
 * Business flow:
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authenticated
 *    connection context (token is managed by the SDK inside `connection`).
 * 2. Using that admin context, create a shipping method via POST
 *    /shoppingMall/admin/shippingMethods with a deterministic
 *    IShoppingMallShippingMethod.ICreate payload.
 * 3. Call PATCH /shoppingMall/admin/shippingMethods with an
 *    IShoppingMallShippingMethod.IRequest body that sets:
 *
 *    - Page = 0
 *    - Limit = small positive integer (e.g., 10)
 *    - Search = created method's `method_code` so it should be matched
 *    - Sort_by = "method_code"
 *    - Sort_direction = "asc"
 * 4. Validate pagination metadata and ensure the created shipping method is
 *    present in the results and the list is ordered by method_code ascending.
 */
export async function test_api_admin_shipping_methods_search_with_results(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to get authenticated admin context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a deterministic shipping method so we can search for it
  const uniqueSuffix = RandomGenerator.alphaNumeric(8);
  const methodCode = `standard-${uniqueSuffix}`;
  const displayName = `Standard Shipping ${uniqueSuffix}`;

  const createBody = {
    method_code: methodCode,
    display_name: displayName,
    service_level_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  const created: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallShippingMethod>(created);

  TestValidator.equals(
    "created method_code matches requested method_code",
    created.method_code,
    methodCode,
  );
  TestValidator.equals(
    "created display_name matches requested display_name",
    created.display_name,
    displayName,
  );

  // 3. Search and paginate shipping methods using index
  const page = 0 satisfies number;
  const limit = 10 satisfies number;

  const searchRequestBody = {
    page,
    limit,
    search: created.method_code,
    sort_by: "method_code",
    sort_direction: "asc" as const,
  } satisfies IShoppingMallShippingMethod.IRequest;

  const pageResult: IPageIShoppingMallShippingMethod.ISummary =
    await api.functional.shoppingMall.admin.shippingMethods.index(connection, {
      body: searchRequestBody,
    });
  typia.assert<IPageIShoppingMallShippingMethod.ISummary>(pageResult);

  // 4. Validate pagination metadata
  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.equals(
    "pagination.current equals requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination.limit equals requested limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination.records is at least 1",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination.pages is at least 1",
    pagination.pages >= 1,
  );

  // 5. Validate that created method appears in the search results
  TestValidator.predicate(
    "search results contain at least one record",
    pageResult.data.length >= 1,
  );

  const found = pageResult.data.find(
    (m) => m.method_code === created.method_code,
  );

  TestValidator.predicate(
    "created shipping method exists in search result set",
    found !== undefined,
  );

  if (found !== undefined) {
    typia.assert<IShoppingMallShippingMethod.ISummary>(found);

    TestValidator.equals(
      "found.method_code equals created.method_code",
      found.method_code,
      created.method_code,
    );
    TestValidator.equals(
      "found.display_name equals created.display_name",
      found.display_name,
      created.display_name,
    );
  }

  // 6. Validate sort ordering by method_code ascending
  const methodCodes = pageResult.data.map((m) => m.method_code);
  const sortedMethodCodes = [...methodCodes].sort();

  TestValidator.equals(
    "search result method_codes are sorted ascending by method_code",
    methodCodes,
    sortedMethodCodes,
  );
}
