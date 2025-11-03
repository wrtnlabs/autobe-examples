import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingFeatureFlag";

/**
 * Validates retrieval of a feature flag's details by an authenticated admin.
 *
 * - Registers a new admin with random business email, secure password, name,
 *   role, and status.
 * - Authenticates as this admin; session will be used for all API calls.
 * - Creates a new unique feature flag (random flag_name) with required fields and
 *   random rollout (present or omitted).
 * - Retrieves the feature flag by its flag_name using the admin GET endpoint.
 * - Asserts all flag fields: id, flag_name, scope, enabled, rollout, description,
 *   timestamps, and deleted_at.
 * - Ensures only non-soft-deleted flags are returned.
 * - Guarantees type safety and business compliance throughout.
 */
export async function test_api_admin_feature_flag_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register admin
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "operator",
      "compliance",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "suspended",
      "pending",
      "locked",
    ] as const),
  } satisfies IShoppingAdmin.IJoin;
  const adminAuthorized: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // Step 2: Create feature flag as admin
  const flagName = `flag_${RandomGenerator.alphaNumeric(8)}`;
  const flagCreateBody = {
    flag_name: flagName,
    scope: RandomGenerator.pick([
      "global",
      "orders",
      "checkout",
      "frontend",
    ] as const),
    enabled: RandomGenerator.pick([true, false] as const),
    rollout:
      RandomGenerator.pick([
        null,
        undefined,
        Math.floor(Math.random() * 101),
      ]) ?? undefined,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingFeatureFlag.ICreate;
  const createdFlag: IShoppingFeatureFlag =
    await api.functional.shopping.admin.featureFlags.create(connection, {
      body: flagCreateBody,
    });
  typia.assert(createdFlag);

  // Step 3: Retrieve feature flag by flagName
  const retrievedFlag: IShoppingFeatureFlag =
    await api.functional.shopping.admin.featureFlags.at(connection, {
      flagName,
    });
  typia.assert(retrievedFlag);

  // Step 4: Assert flag fields are correct and not soft-deleted
  TestValidator.equals(
    "retrieved id matches created",
    retrievedFlag.id,
    createdFlag.id,
  );
  TestValidator.equals(
    "retrieved flag_name matches",
    retrievedFlag.flag_name,
    flagName,
  );
  TestValidator.equals(
    "retrieved scope matches",
    retrievedFlag.scope,
    flagCreateBody.scope,
  );
  TestValidator.equals(
    "retrieved enabled matches",
    retrievedFlag.enabled,
    flagCreateBody.enabled,
  );
  TestValidator.equals(
    "retrieved rollout matches",
    retrievedFlag.rollout,
    flagCreateBody.rollout ?? null,
  );
  TestValidator.equals(
    "retrieved description matches",
    retrievedFlag.description,
    flagCreateBody.description,
  );
  TestValidator.equals(
    "retrieved not soft-deleted",
    retrievedFlag.deleted_at,
    null,
  );
}
