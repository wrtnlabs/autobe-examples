import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentialsActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentialsActor";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskFlag";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate clearing of an active risk flag by a platform administrator.
 *
 * Business goal: Ensure that when a platform admin clears (deactivates) an
 * existing IShoppingMallRiskFlag via the platformAdmin authCredentials
 * riskFlags update endpoint, the flag becomes inactive, the immutable
 * identifiers remain unchanged, and clearedAt is stamped and persists on
 * re-read.
 *
 * High-level steps:
 *
 * 1. Join as a new platform admin to obtain an authorized session.
 * 2. Choose a target authCredentialsId (random UUID) representing the credentials
 *    whose risk flags are being manipulated.
 * 3. Create a new active risk flag for that authCredentialsId.
 * 4. Update the created risk flag, setting active=false and omitting clearedAt so
 *    that the backend stamps the current time.
 * 5. Assert that the update response shows the flag as inactive with a non-null
 *    clearedAt and unchanged id/authCredentialsId.
 * 6. Fetch the risk flag again via GET and verify that the inactive state and
 *    clearedAt timestamp persist.
 */
export async function test_api_platform_admin_clears_active_risk_flag_and_sets_cleared_at(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin to obtain an authorized session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Choose a target authCredentialsId.
  const authCredentialsId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create a new active risk flag for that authCredentialsId.
  const createBody = {
    code: RandomGenerator.alphabets(12),
    reasonCategory: "suspected_fraud",
    riskLevel: "high",
    message: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
  } satisfies IShoppingMallRiskFlag.ICreate;

  const createdFlag: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId,
        body: createBody,
      },
    );
  typia.assert(createdFlag);

  // 4. Update the risk flag: clear it (active=false) and let backend stamp clearedAt.
  const updateBody = {
    active: false,
    notes: "cleared by e2e test",
  } satisfies IShoppingMallRiskFlag.IUpdate;

  const updatedFlag: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.update(
      connection,
      {
        authCredentialsId,
        riskFlagId: createdFlag.id,
        body: updateBody,
      },
    );
  typia.assert(updatedFlag);

  // 5. Validate business rules on the updated response.
  TestValidator.equals(
    "risk flag id must remain unchanged after update",
    updatedFlag.id,
    createdFlag.id,
  );
  TestValidator.equals(
    "authCredentialsId must remain unchanged after update",
    updatedFlag.authCredentialsId,
    createdFlag.authCredentialsId,
  );
  TestValidator.predicate(
    "risk flag should be inactive after clearing",
    updatedFlag.active === false,
  );

  TestValidator.predicate(
    "clearedAt should be populated after clearing an active flag",
    updatedFlag.clearedAt !== null && updatedFlag.clearedAt !== undefined,
  );

  TestValidator.predicate(
    "createdAt should not change on update",
    updatedFlag.createdAt === createdFlag.createdAt,
  );

  TestValidator.predicate(
    "updatedAt should be same or later than previous updatedAt",
    updatedFlag.updatedAt >= createdFlag.updatedAt,
  );

  // 6. Re-read the risk flag and verify that state persists.
  const reloadedFlag: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.at(
      connection,
      {
        authCredentialsId,
        riskFlagId: createdFlag.id,
      },
    );
  typia.assert(reloadedFlag);

  TestValidator.equals(
    "reloaded flag should match updated active state",
    reloadedFlag.active,
    updatedFlag.active,
  );
  TestValidator.equals(
    "reloaded flag should preserve clearedAt timestamp",
    reloadedFlag.clearedAt,
    updatedFlag.clearedAt,
  );
}
