import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

/**
 * Validate partial update behavior for shopping mall business policies.
 *
 * Business goal: Ensure that when an admin updates a business policy using
 * IShoppingMallBusinessPolicy.IUpdate, only the explicitly provided fields are
 * modified and all other fields remain unchanged. This test focuses on updating
 * description and is_active while keeping policy_code, name, and category
 * stable.
 *
 * Scenario steps:
 *
 * 1. Admin joins the platform via POST /auth/admin/join to obtain an authenticated
 *    admin session (connection headers are updated by SDK).
 * 2. The admin creates a new business policy via POST
 *    /shoppingMall/admin/businessPolicies with a fully populated
 *    IShoppingMallBusinessPolicy.ICreate request.
 * 3. Capture the original IShoppingMallBusinessPolicy returned from the creation
 *    call.
 * 4. Perform a partial update via PUT
 *    /shoppingMall/admin/businessPolicies/{policyCode} with an
 *    IShoppingMallBusinessPolicy.IUpdate containing only description and
 *    is_active.
 * 5. Verify that the update response reflects changes only for description and
 *    is_active, while id, policy_code, name, and category remain identical to
 *    the original.
 * 6. Fetch the policy again via GET
 *    /shoppingMall/admin/businessPolicies/{policyCode} and ensure the persisted
 *    state matches the update response and respects the partial update
 *    semantics.
 */
export async function test_api_business_policy_update_partial_fields(
  connection: api.IConnection,
) {
  // 1. Admin joins (authentication)
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

  // 2. Create baseline business policy
  const basePolicyCode = `refund_standard_${RandomGenerator.alphaNumeric(8)}`;
  const basePolicyName = RandomGenerator.paragraph({ sentences: 3 });
  const basePolicyCategory = "refund";
  const basePolicyDescription = RandomGenerator.paragraph({ sentences: 5 });

  const createBody = {
    policy_code: basePolicyCode,
    name: basePolicyName,
    category: basePolicyCategory,
    description: basePolicyDescription,
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const createdPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdPolicy);

  // Sanity checks after creation
  TestValidator.equals(
    "created policy_code should match request",
    createdPolicy.policy_code,
    basePolicyCode,
  );
  TestValidator.equals(
    "created name should match request",
    createdPolicy.name,
    basePolicyName,
  );
  TestValidator.equals(
    "created category should match request",
    createdPolicy.category,
    basePolicyCategory,
  );
  TestValidator.equals(
    "created description should match request",
    createdPolicy.description ?? null,
    basePolicyDescription,
  );
  TestValidator.equals(
    "created is_active should match request",
    createdPolicy.is_active,
    true,
  );

  // 3. Prepare partial update payload: only description and is_active
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedIsActive = !createdPolicy.is_active;

  const updateBody = {
    description: updatedDescription,
    is_active: updatedIsActive,
  } satisfies IShoppingMallBusinessPolicy.IUpdate;

  const updatedPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.update(
      connection,
      {
        policyCode: createdPolicy.policy_code,
        body: updateBody,
      },
    );
  typia.assert(updatedPolicy);

  // 4. Validate partial update semantics on the response
  TestValidator.equals(
    "updated id should remain unchanged",
    updatedPolicy.id,
    createdPolicy.id,
  );
  TestValidator.equals(
    "updated policy_code should remain unchanged",
    updatedPolicy.policy_code,
    createdPolicy.policy_code,
  );
  TestValidator.equals(
    "updated name should remain unchanged when not provided in update body",
    updatedPolicy.name,
    createdPolicy.name,
  );
  TestValidator.equals(
    "updated category should remain unchanged when not provided in update body",
    updatedPolicy.category,
    createdPolicy.category,
  );
  TestValidator.equals(
    "updated description should reflect new value",
    updatedPolicy.description ?? null,
    updatedDescription,
  );
  TestValidator.equals(
    "updated is_active should reflect new value",
    updatedPolicy.is_active,
    updatedIsActive,
  );

  // 5. Re-fetch and validate persistence
  const fetchedPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
      policyCode: createdPolicy.policy_code,
    });
  typia.assert(fetchedPolicy);

  TestValidator.equals(
    "fetched policy id should match updated policy id",
    fetchedPolicy.id,
    updatedPolicy.id,
  );
  TestValidator.equals(
    "fetched policy_code should match updated policy_code",
    fetchedPolicy.policy_code,
    updatedPolicy.policy_code,
  );
  TestValidator.equals(
    "fetched name should match updated name (unchanged from original)",
    fetchedPolicy.name,
    updatedPolicy.name,
  );
  TestValidator.equals(
    "fetched category should match updated category (unchanged from original)",
    fetchedPolicy.category,
    updatedPolicy.category,
  );
  TestValidator.equals(
    "fetched description should match updated description",
    fetchedPolicy.description ?? null,
    updatedDescription,
  );
  TestValidator.equals(
    "fetched is_active should match updated is_active",
    fetchedPolicy.is_active,
    updatedIsActive,
  );
}
