import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

export async function test_api_business_policy_update_happy_path_by_admin(
  connection: api.IConnection,
) {
  // 1. Join as admin to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create baseline business policy as this admin
  const policyCode = `refund_standard_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    policy_code: policyCode,
    name: "Refund Standard Policy (baseline)",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const createdPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallBusinessPolicy>(createdPolicy);

  TestValidator.equals(
    "created policy_code should match creation request",
    createdPolicy.policy_code,
    createBody.policy_code,
  );
  TestValidator.predicate(
    "created policy should be active by initial flag",
    createdPolicy.is_active === true,
  );

  // 3. Update mutable fields of the created policy via PUT
  const updatedName = "Refund Standard Policy (updated)";
  const updatedCategory = "refund_updated";
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedIsActive = false;

  const updateBody = {
    name: updatedName,
    category: updatedCategory,
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
  typia.assert<IShoppingMallBusinessPolicy>(updatedPolicy);

  // Immutable identifiers must remain unchanged
  TestValidator.equals(
    "updated policy id should remain unchanged",
    updatedPolicy.id,
    createdPolicy.id,
  );
  TestValidator.equals(
    "updated policy_code should remain unchanged and match path",
    updatedPolicy.policy_code,
    createdPolicy.policy_code,
  );

  // Updated fields should reflect new values
  TestValidator.equals(
    "updated policy name should reflect new value",
    updatedPolicy.name,
    updatedName,
  );
  TestValidator.equals(
    "updated policy category should reflect new value",
    updatedPolicy.category,
    updatedCategory,
  );
  TestValidator.equals(
    "updated policy description should reflect new value",
    updatedPolicy.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated policy is_active flag should reflect new value",
    updatedPolicy.is_active,
    updatedIsActive,
  );

  // Ensure at least one mutable field actually changed (name)
  TestValidator.notEquals(
    "policy name should change after update",
    createdPolicy.name,
    updatedPolicy.name,
  );

  // created_at should remain stable
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedPolicy.created_at,
    createdPolicy.created_at,
  );

  // 4. Re-fetch policy via GET to confirm persistence
  const fetchedPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.at(connection, {
      policyCode: createdPolicy.policy_code,
    });
  typia.assert<IShoppingMallBusinessPolicy>(fetchedPolicy);

  // Core fields from fetched policy must match updated policy
  TestValidator.equals(
    "fetched policy id should match updated policy",
    fetchedPolicy.id,
    updatedPolicy.id,
  );
  TestValidator.equals(
    "fetched policy_code should match updated policy",
    fetchedPolicy.policy_code,
    updatedPolicy.policy_code,
  );
  TestValidator.equals(
    "fetched policy name should match updated policy name",
    fetchedPolicy.name,
    updatedPolicy.name,
  );
  TestValidator.equals(
    "fetched policy category should match updated policy category",
    fetchedPolicy.category,
    updatedPolicy.category,
  );
  TestValidator.equals(
    "fetched policy description should match updated policy description",
    fetchedPolicy.description,
    updatedPolicy.description,
  );
  TestValidator.equals(
    "fetched policy is_active flag should match updated policy",
    fetchedPolicy.is_active,
    updatedPolicy.is_active,
  );
}
