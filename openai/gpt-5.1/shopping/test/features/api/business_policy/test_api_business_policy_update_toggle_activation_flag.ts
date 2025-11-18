import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

/**
 * Validate admin-side toggling of business policy activation flag.
 *
 * Business context:
 *
 * - IShoppingMallBusinessPolicy represents logical business policies such as
 *   refund rules.
 * - The is_active flag determines whether the policy is currently active for
 *   selection/evaluation or logically retired while remaining in the catalog
 *   for historical/audit purposes.
 * - Admins must be able to safely flip this flag without affecting other
 *   identifying fields like policy_code, name, or category.
 *
 * Test workflow:
 *
 * 1. Join an admin using POST /auth/admin/join so that the SDK attaches an
 *    Authorization header for subsequent admin-only operations.
 * 2. Create a new business policy via POST /shoppingMall/admin/businessPolicies
 *    with:
 *
 *    - Is_active: true
 *    - A deterministic policy_code so it can be re-fetched by code
 *    - Realistic name, category, and optional description
 * 3. Load the policy with GET /shoppingMall/admin/businessPolicies/{policyCode}
 *    and verify:
 *
 *    - Typia.assert returns successfully (valid IShoppingMallBusinessPolicy)
 *    - Is_active is true
 *    - Policy_code, name, category, and description match the create payload
 * 4. Call PUT /shoppingMall/admin/businessPolicies/{policyCode} with an
 *    IShoppingMallBusinessPolicy.IUpdate body that only sets is_active: false,
 *    leaving other fields undefined for partial update.
 * 5. Validate the update response:
 *
 *    - Passes typia.assert
 *    - Is_active is now false
 *    - Policy_code, name, category, and description are unchanged compared to the
 *         pre-update state
 *    - Id remains stable (same policy row)
 * 6. Call PUT again with is_active: true to re-activate the policy.
 * 7. Validate the second update response similarly:
 *
 *    - Is_active is true again
 *    - Policy_code, name, category, description, and id remain unchanged from the
 *         original
 *
 * The test focuses purely on business behavior of toggling is_active and
 * preserving other fields; it does not assert on HTTP status codes or low-level
 * error structures.
 */
export async function test_api_business_policy_update_toggle_activation_flag(
  connection: api.IConnection,
) {
  // 1. Join an admin so that subsequent calls run under admin authorization.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Optional ip left undefined for simplicity (server may infer it).
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new business policy with is_active initially true.
  const policyCode: string = `test_toggle_${RandomGenerator.alphaNumeric(12)}`;
  const createBody = {
    policy_code: policyCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const created: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Basic invariants on created entity.
  TestValidator.equals(
    "created policy_code should equal requested code",
    created.policy_code,
    createBody.policy_code,
  );
  TestValidator.equals(
    "created name should equal requested name",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created category should equal requested category",
    created.category,
    createBody.category,
  );
  TestValidator.equals(
    "created description should equal requested description",
    created.description,
    createBody.description,
  );
  TestValidator.predicate(
    "created is_active should be true",
    created.is_active === true,
  );

  // 3. Fetch the policy by policyCode and confirm baseline state.
  const fetchedBefore: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
      policyCode,
    });
  typia.assert(fetchedBefore);

  TestValidator.equals(
    "fetched-before id should match created id",
    fetchedBefore.id,
    created.id,
  );
  TestValidator.equals(
    "fetched-before policy_code should match created policy_code",
    fetchedBefore.policy_code,
    created.policy_code,
  );
  TestValidator.equals(
    "fetched-before name should match created name",
    fetchedBefore.name,
    created.name,
  );
  TestValidator.equals(
    "fetched-before category should match created category",
    fetchedBefore.category,
    created.category,
  );
  TestValidator.equals(
    "fetched-before description should match created description",
    fetchedBefore.description,
    created.description,
  );
  TestValidator.predicate(
    "fetched-before is_active should be true",
    fetchedBefore.is_active === true,
  );

  // 4. Update is_active to false using partial update DTO.
  const deactivateBody = {
    is_active: false,
  } satisfies IShoppingMallBusinessPolicy.IUpdate;

  const deactivated: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.update(
      connection,
      {
        policyCode,
        body: deactivateBody,
      },
    );
  typia.assert(deactivated);

  // 5. Validate that only the is_active flag changed and core fields stayed the same.
  TestValidator.equals(
    "deactivated id should remain the same as created",
    deactivated.id,
    created.id,
  );
  TestValidator.equals(
    "deactivated policy_code should remain unchanged",
    deactivated.policy_code,
    created.policy_code,
  );
  TestValidator.equals(
    "deactivated name should remain unchanged",
    deactivated.name,
    created.name,
  );
  TestValidator.equals(
    "deactivated category should remain unchanged",
    deactivated.category,
    created.category,
  );
  TestValidator.equals(
    "deactivated description should remain unchanged",
    deactivated.description,
    created.description,
  );
  TestValidator.predicate(
    "deactivated is_active should now be false",
    deactivated.is_active === false,
  );

  // 6. Toggle is_active back to true.
  const reactivateBody = {
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.IUpdate;

  const reactivated: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.update(
      connection,
      {
        policyCode,
        body: reactivateBody,
      },
    );
  typia.assert(reactivated);

  // 7. Validate that flag flips back and other fields are still stable.
  TestValidator.equals(
    "reactivated id should remain the same as created",
    reactivated.id,
    created.id,
  );
  TestValidator.equals(
    "reactivated policy_code should remain unchanged",
    reactivated.policy_code,
    created.policy_code,
  );
  TestValidator.equals(
    "reactivated name should remain unchanged",
    reactivated.name,
    created.name,
  );
  TestValidator.equals(
    "reactivated category should remain unchanged",
    reactivated.category,
    created.category,
  );
  TestValidator.equals(
    "reactivated description should remain unchanged",
    reactivated.description,
    created.description,
  );
  TestValidator.predicate(
    "reactivated is_active should be true again",
    reactivated.is_active === true,
  );
}
