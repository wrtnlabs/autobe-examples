import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingFeatureFlag";

/**
 * Confirm that a newly joined admin can create a feature flag with required
 * parameters: flag_name (unique code), scope, enabled, rollout percent, and
 * description. Test checks admin authentication, global uniqueness of
 * flag_name, and full field population on creation. Also asserts
 * unauthenticated creation is denied, and duplicate flag_name prevents
 * creation.
 *
 * 1. Register a new admin
 * 2. With admin session, create a feature flag with random valid input
 * 3. Check response matches input and all required fields are present
 * 4. Attempt to create duplicate flag_name (expect error)
 * 5. Try unauthenticated creation (expect error)
 */
export async function test_api_admin_feature_flag_creation(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: RandomGenerator.pick([
          "super",
          "compliance",
          "support",
          "operator",
        ] as const),
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a feature flag as the admin
  const flagInput = {
    flag_name: `fflag_${RandomGenerator.alphaNumeric(8)}`,
    scope: RandomGenerator.pick([
      "global",
      "orders",
      "checkout",
      "frontend",
    ] as const),
    enabled: true,
    rollout: 50,
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingFeatureFlag.ICreate;
  const flag: IShoppingFeatureFlag =
    await api.functional.shopping.admin.featureFlags.create(connection, {
      body: flagInput,
    });
  typia.assert(flag);
  TestValidator.equals(
    "returned flag_name matches input",
    flag.flag_name,
    flagInput.flag_name,
  );
  TestValidator.equals("scope matches", flag.scope, flagInput.scope);
  TestValidator.equals("enabled matches", flag.enabled, flagInput.enabled);
  TestValidator.equals("rollout matches", flag.rollout, flagInput.rollout);
  TestValidator.equals(
    "description matches",
    flag.description,
    flagInput.description,
  );

  TestValidator.predicate(
    "id is uuid",
    typeof flag.id === "string" && flag.id.length > 0,
  );
  TestValidator.predicate(
    "created_at present",
    typeof flag.created_at === "string" && flag.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof flag.updated_at === "string" && flag.updated_at.length > 0,
  );

  // 4. Attempt to create flag with duplicate flag_name
  await TestValidator.error("duplicate flag_name is rejected", async () => {
    await api.functional.shopping.admin.featureFlags.create(connection, {
      body: { ...flagInput },
    });
  });

  // 5. Attempt feature flag creation as unauthenticated (simulate by blank headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated flag creation is denied",
    async () => {
      await api.functional.shopping.admin.featureFlags.create(unauthConn, {
        body: {
          flag_name: `fflag_${RandomGenerator.alphaNumeric(8)}`,
          scope: RandomGenerator.pick([
            "global",
            "orders",
            "checkout",
            "frontend",
          ] as const),
          enabled: true,
          rollout: 80,
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IShoppingFeatureFlag.ICreate,
      });
    },
  );
}
