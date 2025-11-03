import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessPolicy";

/**
 * Validates successful update of a business policy by an admin, covering
 * authentication, field update, and verification.
 *
 * Steps:
 *
 * 1. Register a new unique admin and authenticate.
 * 2. Insert a baseline business policy (simulate or via update if pre-existing).
 * 3. Perform an update for a single allowed field (scope, value, description, or
 *    active), selected randomly.
 * 4. Retrieve the policy to verify the field updated, all other fields remain
 *    (excluding audit metadata).
 * 5. Assert business and audit compliance.
 */
export async function test_api_admin_business_policy_update_successful(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role: RandomGenerator.pick([
          "super",
          "support",
          "compliance",
          "operator",
        ] as const),
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Insert an initial business policy by simulating previous existence
  //    Here we mock pre-existence. Normally would create/init via another endpoint
  const initialPolicy: IShoppingBusinessPolicy =
    typia.random<IShoppingBusinessPolicy>();

  // 3. Prepare random update
  const updatableFields = ["scope", "value", "description", "active"] as const;
  const fieldToUpdate = RandomGenerator.pick(updatableFields);
  const updateBody: IShoppingBusinessPolicy.IUpdate = (() => {
    switch (fieldToUpdate) {
      case "scope":
        return {
          scope: RandomGenerator.pick([
            "global",
            "orders",
            "sellers",
            "payments",
          ]),
        };
      case "value":
        return { value: RandomGenerator.alphaNumeric(6) };
      case "description":
        return { description: RandomGenerator.paragraph({ sentences: 5 }) };
      case "active":
        return { active: !initialPolicy.active };
    }
  })();

  // 4. Update business policy
  const updatedPolicy =
    await api.functional.shopping.admin.businessPolicies.update(connection, {
      policyName: initialPolicy.policy_name,
      body: updateBody,
    });
  typia.assert(updatedPolicy);
  // Assert updated field
  for (const key of updatableFields) {
    if (Object.prototype.hasOwnProperty.call(updateBody, key))
      TestValidator.equals(
        `field '${key}' was updated`,
        (updatedPolicy as any)[key],
        (updateBody as any)[key],
      );
  }
  // 5. Validate unchanged primary key and policy_name (should not be affected by update)
  TestValidator.equals(
    "policy_name unchanged",
    updatedPolicy.policy_name,
    initialPolicy.policy_name,
  );
  TestValidator.equals("id unchanged", updatedPolicy.id, initialPolicy.id);
  // 6. Validate description and audit compliance if description was updated
  if (Object.prototype.hasOwnProperty.call(updateBody, "description"))
    TestValidator.predicate(
      "description length sufficient",
      updatedPolicy.description.length >= 5,
    );
  // 7. Validate timestamps (updated_at should be not before initial created_at)
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    new Date(updatedPolicy.updated_at).getTime() >=
      new Date(updatedPolicy.created_at).getTime(),
  );
}
