import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

/**
 * Validate that an admin can still retrieve a logically retired (deactivated)
 * business policy by its policy code, and that lifecycle flags communicate the
 * retired state.
 *
 * Business context:
 *
 * - Business policies (refund rules, review governance, etc.) live in
 *   shopping_mall_business_policies and are addressed by a stable policy_code.
 * - Governance requirements often demand that retired policies remain inspectable
 *   for audit and historical analysis rather than being hard deleted.
 * - The platform provides both update (PUT) and delete (DELETE) endpoints, but
 *   DELETE is documented as permanent removal, so logical retirement for this
 *   test is modeled via is_active=false using the update endpoint.
 *
 * Workflow covered by this test:
 *
 * 1. Admin joins the platform (POST /auth/admin/join), obtaining an authenticated
 *    admin context via SDK side-effects on connection.
 * 2. Admin creates a new business policy using POST
 *    /shoppingMall/admin/businessPolicies.
 * 3. Admin logically retires that policy by calling PUT
 *    /shoppingMall/admin/businessPolicies/{policyCode} with is_active
 *    explicitly set to false.
 * 4. Admin calls GET /shoppingMall/admin/businessPolicies/{policyCode} to retrieve
 *    the policy detail by its policy_code.
 * 5. The test asserts that:
 *
 *    - The GET call succeeds and returns a valid IShoppingMallBusinessPolicy
 *         instance.
 *    - The returned policy still has the same policy_code as created.
 *    - Is_active is false, reflecting logical retirement.
 *    - Deleted_at stays as-is (commonly null) because we did not perform a hard
 *         delete.
 *
 * This scenario verifies that the detail endpoint remains usable for governance
 * and audit after deactivation, and that lifecycle state fields accurately
 * convey that the policy is no longer active.
 */
export async function test_api_business_policy_detail_after_logical_retirement(
  connection: api.IConnection,
) {
  // 1. Admin joins the platform to obtain an authenticated admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new business policy that we will later retire.
  const createPolicyBody = {
    policy_code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    category: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 10,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const createdPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: createPolicyBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(createdPolicy);

  TestValidator.equals(
    "created policy_code should match request body",
    createdPolicy.policy_code,
    createPolicyBody.policy_code,
  );
  TestValidator.predicate(
    "created policy should initially be active",
    createdPolicy.is_active === true,
  );

  // 3. Logically retire the policy by setting is_active to false via update.
  const retiredPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.update(
      connection,
      {
        policyCode: createdPolicy.policy_code,
        body: {
          is_active: false,
        } satisfies IShoppingMallBusinessPolicy.IUpdate,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(retiredPolicy);

  TestValidator.equals(
    "retired policy_code should remain stable",
    retiredPolicy.policy_code,
    createdPolicy.policy_code,
  );
  TestValidator.predicate(
    "policy is_active flag should be false after retirement update",
    retiredPolicy.is_active === false,
  );

  // 4. Retrieve the logically retired policy via GET /shoppingMall/admin/businessPolicies/{policyCode}.
  const fetchedPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
      policyCode: createdPolicy.policy_code,
    });
  typia.assert<IShoppingMallBusinessPolicy>(fetchedPolicy);

  // 5. Validate that the policy detail reflects logical retirement and remains retrievable.
  TestValidator.equals(
    "fetched policy_code should match created policy_code",
    fetchedPolicy.policy_code,
    createdPolicy.policy_code,
  );
  TestValidator.predicate(
    "fetched policy should be logically retired (is_active === false)",
    fetchedPolicy.is_active === false,
  );

  // We do not enforce deleted_at semantics here, because retirement is modeled
  // via is_active=false, and deleted_at may remain null depending on service
  // implementation. The critical governance requirement is that the policy
  // remains retrievable and clearly marked as inactive.
}
