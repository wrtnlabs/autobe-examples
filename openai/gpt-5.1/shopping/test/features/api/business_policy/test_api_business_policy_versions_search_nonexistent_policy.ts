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
 * Validate that listing versions for a non-existent business policy fails.
 *
 * Business goal
 *
 * - Ensure that the admin-facing policy version search endpoint does not silently
 *   succeed when the referenced policyCode does not exist.
 * - When an administrator queries versions using a policy code that is not
 *   registered in IShoppingMallBusinessPolicy, the operation should fail rather
 *   than returning an empty IPageIShoppingMallPolicyVersion.ISummary page as if
 *   the policy existed.
 *
 * What this test covers
 *
 * 1. Admin authentication prerequisite using POST /auth/admin/join.
 * 2. A PATCH request to /shoppingMall/admin/businessPolicies/{policyCode}/versions
 *    using a fabricated, random policyCode and a valid
 *    IShoppingMallPolicyVersion.IRequest body (page & limit only).
 * 3. Validation that the call does not return a normal success response, by
 *    expecting the SDK call to fail at runtime through TestValidator.error.
 *
 * Notes
 *
 * - We do not and must not assert the HTTP status code (e.g., 404), since the SDK
 *   abstracts it away behind HttpError and the guidelines prohibit explicit
 *   status checking.
 * - We also do not attempt any malformed type or schema violations; the request
 *   body is always well-typed so that any failure comes purely from the
 *   business rule that the policyCode does not exist.
 */
export async function test_api_business_policy_versions_search_nonexistent_policy(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an authorized admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a fabricated policyCode that is extremely unlikely to exist.
  //    Using a long, random alphanumeric string reduces the chance that any
  //    pre-seeded fixtures accidentally match this code.
  const nonexistentPolicyCode: string = `nonexistent-policy-${RandomGenerator.alphaNumeric(32)}`;

  // 3. Construct a minimal, but valid, search request body.
  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallPolicyVersion.IRequest;

  // 4. Expect the listing call to fail for the non-existent policy code.
  await TestValidator.error(
    "listing versions for a non-existent business policy code must fail",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.versions.index(
        connection,
        {
          policyCode: nonexistentPolicyCode,
          body: requestBody,
        },
      );
    },
  );
}
