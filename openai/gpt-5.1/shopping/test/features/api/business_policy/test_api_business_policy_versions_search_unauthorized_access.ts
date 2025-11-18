import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPolicyVersion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Verify that unauthenticated callers cannot list business policy versions.
 *
 * Business context
 *
 * - Listing business policy versions is an admin-only governance operation.
 * - A non-authenticated caller must not be able to list versions even if the
 *   underlying policy and versions exist.
 *
 * Steps
 *
 * 1. Join an admin to get an authenticated admin connection.
 * 2. Create a business policy.
 * 3. Create at least one version for that policy.
 * 4. Build an unauthenticated connection without Authorization header.
 * 5. Call the versions.index endpoint with a valid request body.
 * 6. Verify that the request fails with an HTTP authorization error (401/403) and
 *    therefore does not return a page payload.
 */
export async function test_api_business_policy_versions_search_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated context
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a business policy
  const policyCreateBody = typia.random<IShoppingMallBusinessPolicy.ICreate>();

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert(policy);

  // 3. Create at least one version for that policy
  const versionCreateBody = typia.random<IShoppingMallPolicyVersion.ICreate>();

  const version: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: versionCreateBody,
      },
    );
  typia.assert(version);

  // 4. Derive unauthenticated connection (no Authorization header)
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Prepare a valid search request body
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallPolicyVersion.IRequest;

  // 6. Call the index endpoint without Authorization and expect an HTTP error
  await TestValidator.httpError(
    "unauthorized access to policy versions index should be rejected",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.versions.index(
        unauthenticated,
        {
          policyCode: policy.policy_code,
          body: requestBody,
        },
      );
    },
  );
}
