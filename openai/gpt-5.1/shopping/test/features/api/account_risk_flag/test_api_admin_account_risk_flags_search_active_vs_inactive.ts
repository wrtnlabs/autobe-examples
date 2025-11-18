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
 * Validate admin search of account risk flags filtered by active status.
 *
 * Business purpose: Ensure that the privileged account risk flag search
 * endpoint correctly respects the `active` filter, so that administrative and
 * risk-operations tools can reliably distinguish currently effective flags from
 * inactive or historical ones.
 *
 * High-level flow:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authorized admin
 *    context with JWT automatically wired into the connection.
 * 2. Invoke PATCH /shoppingMall/admin/accountRiskFlags with `active: true` and
 *    deterministic pagination parameters.
 * 3. Assert the response structure and verify that every returned
 *    IShoppingMallAccountRiskFlag.ISummary has active === true.
 * 4. Invoke the same endpoint again with `active: false` to retrieve inactive
 *    flags.
 * 5. Assert structure and verify that no returned summary has active === true
 *    (i.e., all are inactive), accepting an empty result set as valid.
 * 6. Optionally, verify that pagination metadata is consistent with requested
 *    parameters for both invocations.
 */
export async function test_api_admin_account_risk_flags_search_active_vs_inactive(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional and may be derived server-side; omit it here
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Search for ACTIVE risk flags (active === true)
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const activeRequestBody = {
    page,
    limit,
    // Focus this call purely on active filter; other filters undefined
    active: true,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const activePage: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.accountRiskFlags.index(connection, {
      body: activeRequestBody,
    });
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(activePage);

  // 2-1. Validate pagination metadata for active search
  TestValidator.equals(
    "active search: pagination.current should equal requested page",
    activePage.pagination.current,
    page,
  );
  TestValidator.equals(
    "active search: pagination.limit should equal requested limit",
    activePage.pagination.limit,
    limit,
  );

  // 2-2. Validate that all returned flags are active === true
  await ArrayUtil.asyncForEach(
    activePage.data,
    async (flag: IShoppingMallAccountRiskFlag.ISummary, index: number) => {
      typia.assert<IShoppingMallAccountRiskFlag.ISummary>(flag);
      TestValidator.equals(
        `active search: flag at index ${index} must have active === true`,
        flag.active,
        true,
      );
    },
  );

  // 3. Search for INACTIVE risk flags (active === false)
  const inactiveRequestBody = {
    page,
    limit,
    active: false,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const inactivePage: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.accountRiskFlags.index(connection, {
      body: inactiveRequestBody,
    });
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(inactivePage);

  // 3-1. Validate pagination metadata for inactive search
  TestValidator.equals(
    "inactive search: pagination.current should equal requested page",
    inactivePage.pagination.current,
    page,
  );
  TestValidator.equals(
    "inactive search: pagination.limit should equal requested limit",
    inactivePage.pagination.limit,
    limit,
  );

  // 3-2. Validate that no returned summary has active === true
  await ArrayUtil.asyncForEach(
    inactivePage.data,
    async (flag: IShoppingMallAccountRiskFlag.ISummary, index: number) => {
      typia.assert<IShoppingMallAccountRiskFlag.ISummary>(flag);
      TestValidator.equals(
        `inactive search: flag at index ${index} must have active === false`,
        flag.active,
        false,
      );
    },
  );

  // 4. Cross-check that no record violates requested active status between calls
  //    (If implementation ever returns mixed statuses, this will fail.)
  await TestValidator.predicate(
    "active and inactive result sets do not contain conflicting active flags",
    async () => {
      const hasNonActiveInActiveSet = await ArrayUtil.asyncFilter(
        activePage.data,
        async (flag) => flag.active !== true,
      );
      const hasActiveInInactiveSet = await ArrayUtil.asyncFilter(
        inactivePage.data,
        async (flag) => flag.active !== false,
      );

      return (
        hasNonActiveInActiveSet.length === 0 &&
        hasActiveInInactiveSet.length === 0
      );
    },
  );
}
