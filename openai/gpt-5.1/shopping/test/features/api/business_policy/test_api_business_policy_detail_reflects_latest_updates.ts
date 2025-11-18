import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

/**
 * Ensure business policy detail endpoint reflects latest updates.
 *
 * Business context:
 *
 * - Admins manage logical business policies (refund rules, review moderation,
 *   etc.) via shopping_mall_business_policies.
 * - Admin consoles typically show a detail view sourced from GET
 *   /shoppingMall/admin/businessPolicies/{policyCode}.
 * - When admins edit a policy (name/category/description/is_active), the detail
 *   view must show the latest persisted state, not stale data from caches or
 *   lagging read models.
 *
 * This test verifies that the detail endpoint returns the updated
 * representation immediately after an update operation, including monotonic
 * updated_at behavior.
 *
 * Test steps:
 *
 * 1. Register an admin using POST /auth/admin/join with a realistic email,
 *    password, and session metadata.
 *
 *    - Rely on the SDK to bind the returned access token into the connection headers
 *         automatically.
 * 2. Create a new business policy via POST /shoppingMall/admin/businessPolicies
 *    with IShoppingMallBusinessPolicy.ICreate.
 *
 *    - Use a unique policy_code value.
 *    - Fill name, category, description, and is_active with known initial values.
 * 3. Retrieve the policy detail via GET
 *    /shoppingMall/admin/businessPolicies/{policyCode}.
 *
 *    - Capture created_at and updated_at from the returned
 *         IShoppingMallBusinessPolicy.
 *    - Assert that the basic fields (policy_code, name, category, description,
 *         is_active) match the create request, using TestValidator.equals.
 * 4. Prepare an update payload IShoppingMallBusinessPolicy.IUpdate that changes
 *    all mutable fields:
 *
 *    - Name: different string
 *    - Category: different string
 *    - Description: flip between non-null and null to exercise nullable behavior
 *    - Is_active: toggle boolean state
 * 5. Call PUT /shoppingMall/admin/businessPolicies/{policyCode} with the update
 *    payload.
 *
 *    - Assert that the response body typia.asserts to IShoppingMallBusinessPolicy.
 * 6. Immediately call GET /shoppingMall/admin/businessPolicies/{policyCode} again.
 *
 *    - Assert via typia.assert that the response is a valid
 *         IShoppingMallBusinessPolicy.
 *    - Use TestValidator.equals to ensure:
 *
 *         - Policy_code matches the original policy_code (identifier is stable).
 *         - Name, category, description, is_active all match the update payload values.
 *    - Use TestValidator.predicate to ensure:
 *
 *         - Created_at is equal to the original created_at from the first detail fetch.
 *         - Updated_at is greater than or equal to the original updated_at. (We allow
 *                   equality in case the DB timestamp precision causes both
 *                   writes to have the same value, but typically it will be
 *                   strictly greater.)
 */
export async function test_api_business_policy_detail_reflects_latest_updates(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create a new business policy with initial values
  const initialPolicyCode: string = `refund_standard_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    policy_code: initialPolicyCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "refund",
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
  typia.assert<IShoppingMallBusinessPolicy>(created);

  // 3. Retrieve detail and assert it matches the create payload
  const initialDetail: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
      policyCode: initialPolicyCode,
    });
  typia.assert<IShoppingMallBusinessPolicy>(initialDetail);

  // Field equality checks for initial state
  TestValidator.equals(
    "initial policy_code matches created policy_code",
    initialDetail.policy_code,
    createBody.policy_code,
  );
  TestValidator.equals(
    "initial name matches created name",
    initialDetail.name,
    createBody.name,
  );
  TestValidator.equals(
    "initial category matches created category",
    initialDetail.category,
    createBody.category,
  );
  TestValidator.equals(
    "initial description matches created description",
    initialDetail.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "initial is_active matches created is_active",
    initialDetail.is_active,
    createBody.is_active,
  );

  const originalCreatedAt: string = initialDetail.created_at;
  const originalUpdatedAt: string = initialDetail.updated_at;

  // 4. Prepare update payload flipping all mutable fields
  const updatedName: string = RandomGenerator.paragraph({ sentences: 4 });
  const updatedCategory: string = "refund_policy_updated";
  // Flip description: if previously non-null, set to null; otherwise set to non-null text
  const updatedDescription: string | null =
    initialDetail.description !== null &&
    initialDetail.description !== undefined
      ? null
      : RandomGenerator.paragraph({ sentences: 2 });
  const updatedIsActive: boolean = !initialDetail.is_active;

  const updateBody = {
    name: updatedName,
    category: updatedCategory,
    description: updatedDescription,
    is_active: updatedIsActive,
  } satisfies IShoppingMallBusinessPolicy.IUpdate;

  const updated: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.update(
      connection,
      {
        policyCode: initialPolicyCode,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(updated);

  // 5. Retrieve detail again and validate it reflects the latest updates
  const finalDetail: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
      policyCode: initialPolicyCode,
    });
  typia.assert<IShoppingMallBusinessPolicy>(finalDetail);

  // policy_code must remain stable
  TestValidator.equals(
    "final policy_code remains unchanged",
    finalDetail.policy_code,
    initialPolicyCode,
  );

  // Mutable fields must match update payload
  TestValidator.equals(
    "final name matches updated name",
    finalDetail.name,
    updatedName,
  );
  TestValidator.equals(
    "final category matches updated category",
    finalDetail.category,
    updatedCategory,
  );
  TestValidator.equals(
    "final description matches updated description (including nullability)",
    finalDetail.description ?? null,
    updatedDescription ?? null,
  );
  TestValidator.equals(
    "final is_active matches updated is_active",
    finalDetail.is_active,
    updatedIsActive,
  );

  // created_at should remain the same
  TestValidator.equals(
    "created_at remains unchanged after update",
    finalDetail.created_at,
    originalCreatedAt,
  );

  // updated_at should be monotonically non-decreasing
  const originalUpdatedTime: number = Date.parse(originalUpdatedAt);
  const finalUpdatedTime: number = Date.parse(finalDetail.updated_at);

  TestValidator.predicate(
    "updated_at is greater than or equal to the original updated_at",
    finalUpdatedTime >= originalUpdatedTime,
  );
}
