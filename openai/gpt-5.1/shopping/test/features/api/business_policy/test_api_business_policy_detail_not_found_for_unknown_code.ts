import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

/**
 * Verify that requesting details of a non-existent business policy by
 * policyCode results in an error instead of a successful
 * IShoppingMallBusinessPolicy payload.
 *
 * Business context: Admin consoles and backoffice tools use GET
 * /shoppingMall/admin/businessPolicies/{policyCode} to load full policy
 * configurations (e.g., refund rules, review moderation policies). When an
 * admin navigates to a policyCode that does not exist (due to typo, stale
 * bookmark, or misconfiguration), the backend must clearly fail the request
 * instead of returning a default or simulated policy object.
 *
 * This test ensures:
 *
 * 1. An administrator can authenticate via POST /auth/admin/join and obtain valid
 *    JWT credentials in the connection.
 * 2. A deliberately unknown policyCode is chosen such that it is extremely
 *    unlikely to exist in shopping_mall_business_policies.
 * 3. Calling GET /shoppingMall/admin/businessPolicies/{policyCode} with this
 *    unknown code throws an error (e.g., not-found), rather than returning
 *    IShoppingMallBusinessPolicy or silently succeeding.
 * 4. The test does not depend on specific HTTP status codes or error payload
 *    structures; it only asserts that an error occurs for the invalid
 *    identifier.
 *
 * High-level steps:
 *
 * 1. Join as an admin using a random email/password and realistic href/referrer
 *    values to establish an authenticated admin session.
 * 2. Generate a random, long alphanumeric policyCode unlikely to collide with real
 *    data.
 * 3. Wrap a call to api.functional.shoppingMall.admin.businessPolicies.at in
 *    TestValidator.error to assert that the call fails.
 */
export async function test_api_business_policy_detail_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Establish an authenticated admin session via POST /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Generate a policyCode that is extremely unlikely to exist
  const unknownPolicyCode: string = `unknown-policy-${RandomGenerator.alphaNumeric(32)}`;

  // 3. Assert that requesting this non-existent policy results in an error
  await TestValidator.error(
    "requesting unknown business policy code should fail",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
        policyCode: unknownPolicyCode,
      });
    },
  );
}
