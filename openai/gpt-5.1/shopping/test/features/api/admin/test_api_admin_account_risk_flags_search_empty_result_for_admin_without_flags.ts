import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccountRiskFlag";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that admin-specific account risk flag search returns an empty page
 * for an admin without any linked flags.
 *
 * Business context: This test verifies the read-only governance endpoint that
 * lists risk flags linked to a specific administrator account via the
 * shopping_mall_account_risk_flags_of_admins linkage table. For many admins,
 * especially newly created ones, there may be no associated risk flags. The
 * endpoint must still behave correctly: authenticate, scope by adminId, apply
 * pagination, and return a structurally valid empty page without creating or
 * mutating any risk flag data.
 *
 * Scenario steps:
 *
 * 1. Join an admin using POST /auth/admin/join to obtain an authenticated
 *    administrator session and a concrete admin id.
 * 2. Immediately use that same admin id as the target adminId path parameter when
 *    calling PATCH /shoppingMall/admin/admins/{adminId}/accountRiskFlags via
 *    the api.functional.shoppingMall.admin.admins.accountRiskFlags.index
 *    function, passing a simple IShoppingMallAccountRiskFlag.IRequest body with
 *    page=1 and limit=10 and no additional filters.
 * 3. Validate that the returned page is structurally correct and represents an
 *    empty result set:
 *
 *    - Response can be asserted as IPageIShoppingMallAccountRiskFlag.ISummary via
 *         typia.assert.
 *    - Pagination.current should equal 1.
 *    - Pagination.limit should equal 10.
 *    - Pagination.records should be 0 and pagination.pages should be 0, representing
 *         the zero-state semantics.
 *    - Data array should be empty.
 * 4. Confirm read-only semantics from a black-box perspective by not performing
 *    any side-effecting operations and relying on the endpoint contract and DTO
 *    types (no explicit DB inspection is possible in this environment).
 */
export async function test_api_admin_account_risk_flags_search_empty_result_for_admin_without_flags(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain an authenticated context and admin id.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  // Use the newly created admin's id as the target adminId.
  const adminId = authorized.id;

  // 2. Call the admin-specific account risk flags search with page=1, limit=10.
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const pageResult: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.admins.accountRiskFlags.index(
      connection,
      {
        adminId,
        body: requestBody,
      },
    );

  // 3. Validate structural correctness and empty result semantics.
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "pagination limit should equal requested limit (10)",
    pagination.limit,
    10 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "pagination records should be 0 for admin without flags",
    pagination.records,
    0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "pagination pages should be 0 for empty dataset",
    pagination.pages,
    0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "data array should be empty when no risk flags are linked",
    pageResult.data,
    [] as IShoppingMallAccountRiskFlag.ISummary[],
  );
}
