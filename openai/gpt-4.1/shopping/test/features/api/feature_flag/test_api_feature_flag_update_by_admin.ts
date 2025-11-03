import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingFeatureFlag";

/**
 * Test that an admin can update a feature flag's properties (enabled, rollout,
 * description, scope), and that the changes are persisted and accurately
 * reflected in the API response.
 *
 * 1. Register a new admin (with random but valid credentials, role, and status).
 * 2. Pick or define a realistic feature flag name (simulate that the flag exists).
 * 3. Update the feature flag with new random but valid settings:
 *
 *    - Toggle enabled state (flip it)
 *    - Set rollout to a new percentage with bounds (e.g., 25 or 90)
 *    - Change scope and business description
 * 4. Send update via admin endpoint.
 * 5. Confirm that response reflects updated values and types, with persistence
 *    implied.
 */
export async function test_api_feature_flag_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin (auth)
  const adminJoin: IShoppingAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "superadmin", // role field must be >=2 <=32 characters, realistic admin role
    status: "active", // allowed status value
  };
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin });
  typia.assert(admin);

  // 2. Assume a feature flag exists; pick a plausible flag name for the test
  const flagName = "experimental_checkout";

  // 3. Prepare new flag configuration (flip enabled, set random rollout, change scope/description)
  const updateInput = {
    enabled: true,
    rollout: 75,
    scope: "checkout",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingFeatureFlag.IUpdate;

  // 4. Send update request as admin
  const updated: IShoppingFeatureFlag =
    await api.functional.shopping.admin.featureFlags.update(connection, {
      flagName,
      body: updateInput,
    });
  typia.assert(updated);
  TestValidator.equals(
    "flag name should match path param",
    updated.flag_name,
    flagName,
  );
  TestValidator.equals(
    "enabled field updated",
    updated.enabled,
    updateInput.enabled,
  );
  TestValidator.equals(
    "rollout value updated",
    updated.rollout,
    updateInput.rollout,
  );
  TestValidator.equals("scope updated", updated.scope, updateInput.scope);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateInput.description,
  );
  TestValidator.predicate(
    "rollout is within 0-100",
    updated.rollout !== null &&
      updated.rollout !== undefined &&
      updated.rollout >= 0 &&
      updated.rollout <= 100,
  );
}
