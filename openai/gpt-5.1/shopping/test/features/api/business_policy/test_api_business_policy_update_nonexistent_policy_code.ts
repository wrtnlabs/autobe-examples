import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

/**
 * Verify that updating a non-existent business policy by policyCode fails and
 * does not upsert.
 *
 * Business context:
 *
 * - Business policies in shopping_mall_business_policies are identified by a
 *   stable business policy_code used in admin tooling and URLs.
 * - The update endpoint PUT /shoppingMall/admin/businessPolicies/{policyCode} is
 *   documented to modify an existing logical policy definition and to return
 *   not-found when the policyCode does not match any existing row.
 * - The operation must never behave as an upsert: a call with an unknown
 *   policyCode must not create a new policy row.
 *
 * Test workflow:
 *
 * 1. Join an admin account using POST /auth/admin/join to obtain an authenticated
 *    admin context.
 * 2. Generate a random policyCode string that is extremely unlikely to exist.
 * 3. Optionally attempt to GET /shoppingMall/admin/businessPolicies/{policyCode}
 *    with that code and expect an error, confirming precondition that no such
 *    policy exists.
 * 4. Call PUT /shoppingMall/admin/businessPolicies/{policyCode} using the
 *    non-existent policyCode and a valid IShoppingMallBusinessPolicy.IUpdate
 *    payload.
 * 5. Validate that the update call fails with an HttpError via TestValidator.error
 *    or TestValidator.httpError, but do NOT assert a specific HTTP status code
 *    (status assertions are forbidden by guidelines). Only confirm that some
 *    HTTP error occurs.
 * 6. Optionally call GET again with the same policyCode and expect an error,
 *    reinforcing that the update did not create a new policy and that the
 *    endpoint does not implement upsert behavior.
 */
export async function test_api_business_policy_update_nonexistent_policy_code(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Prepare a policyCode that is extremely unlikely to exist
  const nonexistentPolicyCode: string = RandomGenerator.alphaNumeric(32);

  // 3. Optionally confirm precondition by attempting to GET and expecting an error
  await TestValidator.error(
    "get non-existent business policy must fail",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
        policyCode: nonexistentPolicyCode,
      });
    },
  );

  // 4. Prepare a valid update body
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.IUpdate;

  // 5. Attempt to update non-existent policy and expect an HTTP error
  await TestValidator.error(
    "update non-existent business policy must fail and not upsert",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.update(
        connection,
        {
          policyCode: nonexistentPolicyCode,
          body: updateBody,
        },
      );
    },
  );

  // 6. Optionally verify again that GET still fails, proving no upsert occurred
  await TestValidator.error(
    "get still fails after failed update, confirming no upsert",
    async () => {
      await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
        policyCode: nonexistentPolicyCode,
      });
    },
  );
}
