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
 * Validate rejection of risk flag update when using mismatched auth
 * credentials.
 *
 * Business goal: Ensure that a risk flag is strictly scoped to its owning
 * authentication credentials record. Even a privileged platform administrator
 * must not be able to update a flag by combining a valid riskFlagId with an
 * unrelated authCredentialsId. The system should reject such cross-credentials
 * updates and leave the original flag unchanged.
 *
 * Scenario steps:
 *
 * 1. Join as a platform administrator using POST /auth/platformAdmin/join to
 *    obtain an authorized admin session.
 * 2. Generate two distinct UUIDs to represent auth credentials contexts A and B (A
 *    != B).
 * 3. Create a risk flag under credentials A via POST
 *    /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags
 *    using a valid IShoppingMallRiskFlag.ICreate body, and capture the
 *    resulting IShoppingMallRiskFlag.
 * 4. Attempt to update this flag with PUT
 *    /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags/{riskFlagId}
 *    but supply authCredentialsId_B in the path while using the riskFlagId
 *    created for A, and an otherwise valid IShoppingMallRiskFlag.IUpdate
 *    payload.
 * 5. Assert that this update attempt fails by expecting an error via
 *    TestValidator.error (without asserting any specific HTTP status).
 * 6. Re-read the flag using the correct authCredentialsId_A and riskFlagId through
 *    the GET endpoint and assert that its identity and business fields remain
 *    identical to the post-creation state, proving that the failed mismatched
 *    update did not mutate the resource.
 */
export async function test_api_platform_admin_attempts_to_update_risk_flag_for_mismatched_auth_credentials(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized session
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Prepare two distinct auth credential IDs: A and B
  const authCredentialsIdA: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  let authCredentialsIdB: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Ensure B is different from A
  while (authCredentialsIdB === authCredentialsIdA) {
    authCredentialsIdB = typia.random<string & tags.Format<"uuid">>();
  }

  // 3. Create a risk flag under credentials A
  const createBody = typia.random<IShoppingMallRiskFlag.ICreate>();
  const created: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId: authCredentialsIdA,
        body: createBody,
      },
    );
  typia.assert<IShoppingMallRiskFlag>(created);

  // Snapshot original key fields for later comparison
  const originalId = created.id;
  const originalAuthCredentialsId = created.authCredentialsId;
  const originalRiskLevel = created.riskLevel;
  const originalReasonCategory = created.reasonCategory;
  const originalActive = created.active;
  const originalNotes = created.notes ?? null;
  const originalClearedAt = created.clearedAt ?? null;

  // 4. Attempt to update the flag using mismatched authCredentialsId_B
  const updateBody = {
    // attempt to flip these values; they must not be applied
    riskLevel: createBody.riskLevel,
    reasonCategory: createBody.reasonCategory,
    active: !createBody.active,
    notes: (createBody.notes ?? "") + " (updated)",
  } satisfies IShoppingMallRiskFlag.IUpdate;

  await TestValidator.error(
    "mismatched authCredentialsId must reject risk flag update",
    async () => {
      await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.update(
        connection,
        {
          authCredentialsId: authCredentialsIdB,
          riskFlagId: created.id,
          body: updateBody,
        },
      );
    },
  );

  // 5. Re-read the original flag via the correct authCredentialsId_A
  const reloaded: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.at(
      connection,
      {
        authCredentialsId: authCredentialsIdA,
        riskFlagId: created.id,
      },
    );
  typia.assert<IShoppingMallRiskFlag>(reloaded);

  // 6. Assert that core identity fields are unchanged
  TestValidator.equals(
    "risk flag id remains unchanged after failed mismatched update",
    reloaded.id,
    originalId,
  );
  TestValidator.equals(
    "authCredentialsId remains bound to original credentials A",
    reloaded.authCredentialsId,
    originalAuthCredentialsId,
  );

  // 7. Assert that fields targeted by the mismatched update did not change
  TestValidator.equals(
    "riskLevel is unchanged after mismatched update attempt",
    reloaded.riskLevel,
    originalRiskLevel,
  );
  TestValidator.equals(
    "reasonCategory is unchanged after mismatched update attempt",
    reloaded.reasonCategory,
    originalReasonCategory,
  );
  TestValidator.equals(
    "active flag is unchanged after mismatched update attempt",
    reloaded.active,
    originalActive,
  );
  TestValidator.equals(
    "notes are unchanged after mismatched update attempt",
    reloaded.notes ?? null,
    originalNotes,
  );
  TestValidator.equals(
    "clearedAt is unchanged after mismatched update attempt",
    reloaded.clearedAt ?? null,
    originalClearedAt,
  );
}
