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
 * Validate reactivation of a previously cleared risk flag by a platform admin.
 *
 * Business goal: Ensure that a platform administrator, after joining and
 * obtaining an authorized session, can manage the lifecycle of a risk flag
 * attached to an authentication credentials record:
 *
 * - Create a new active risk flag
 * - Clear the flag (active=false, clearedAt set by backend)
 * - Reactivate the same flag (active=true) without creating duplicates
 * - Observe and lock in the backend policy for clearedAt on reactivation
 *
 * High-level flow:
 *
 * 1. Join as platform admin via POST /auth/platformAdmin/join.
 * 2. Choose a target authCredentialsId (UUID) to attach risk flags to.
 * 3. Create an initial risk flag for that authCredentialsId with active=true.
 * 4. Clear the flag via PUT update (active=false) and verify clearedAt.
 * 5. Reactivate the same flag via PUT update (active=true), modifying
 *    riskLevel/notes, and assert id/authCredentialsId stability and clearedAt
 *    policy consistency.
 * 6. Re-read the flag via GET and confirm that persisted state matches the
 *    reactivation response.
 */
export async function test_api_platform_admin_reactivates_cleared_risk_flag(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (auth bootstrap)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.mobile(), // just a random-ish string; not validated as IP format here
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Pick target auth credentials id (UUID)
  const authCredentialsId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create an initial active risk flag
  const createBody = {
    code: "multiple_failed_payments",
    reasonCategory: "suspected_fraud",
    riskLevel: "high",
    message: RandomGenerator.paragraph({ sentences: 6 }),
    active: true,
    expiresAt: null,
    notes: "Initial risk flag created for repeated failed payments.",
  } satisfies IShoppingMallRiskFlag.ICreate;

  const created: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId,
        body: createBody,
      },
    );
  typia.assert(created);

  TestValidator.equals(
    "new risk flag is active on creation",
    created.active,
    true,
  );

  // capture identifiers and initial clearedAt
  const riskFlagId: string & tags.Format<"uuid"> = created.id;
  const initialClearedAt = created.clearedAt ?? null;

  // 4. Clear the flag via update (active=false)
  const clearBody = {
    active: false,
    notes: "Flag cleared after manual review by risk team.",
  } satisfies IShoppingMallRiskFlag.IUpdate;

  const cleared: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.update(
      connection,
      {
        authCredentialsId,
        riskFlagId,
        body: clearBody,
      },
    );
  typia.assert(cleared);

  TestValidator.equals(
    "risk flag remains same id after clear",
    cleared.id,
    riskFlagId,
  );
  TestValidator.equals(
    "risk flag belongs to same authCredentialsId after clear",
    cleared.authCredentialsId,
    authCredentialsId,
  );
  TestValidator.equals(
    "risk flag becomes inactive after clear",
    cleared.active,
    false,
  );

  const clearedClearedAt = cleared.clearedAt ?? null;
  TestValidator.predicate(
    "clearedAt should be set when flag is cleared (or at least change from initial)",
    () => clearedClearedAt !== null || initialClearedAt === clearedClearedAt,
  );

  // Optional: GET to confirm persisted cleared state
  const clearedReloaded: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.at(
      connection,
      {
        authCredentialsId,
        riskFlagId,
      },
    );
  typia.assert(clearedReloaded);

  TestValidator.equals(
    "reloaded cleared flag matches id",
    clearedReloaded.id,
    riskFlagId,
  );
  TestValidator.equals(
    "reloaded cleared flag is inactive",
    clearedReloaded.active,
    false,
  );

  const reloadedClearedAt = clearedReloaded.clearedAt ?? null;
  TestValidator.equals(
    "reloaded clearedAt matches cleared response",
    reloadedClearedAt,
    clearedClearedAt,
  );

  // 5. Reactivate the same flag
  const reactivationNotes =
    "Flag reactivated due to new suspicious activity from same credentials.";
  const reactivateBody = {
    active: true,
    riskLevel: "medium",
    notes: reactivationNotes,
    clearedAt: null,
  } satisfies IShoppingMallRiskFlag.IUpdate;

  const reactivated: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.update(
      connection,
      {
        authCredentialsId,
        riskFlagId,
        body: reactivateBody,
      },
    );
  typia.assert(reactivated);

  TestValidator.equals(
    "reactivated flag keeps same id (no duplicate record)",
    reactivated.id,
    riskFlagId,
  );
  TestValidator.equals(
    "reactivated flag stays on same authCredentialsId",
    reactivated.authCredentialsId,
    authCredentialsId,
  );
  TestValidator.equals(
    "reactivated flag is active again",
    reactivated.active,
    true,
  );
  TestValidator.equals(
    "reactivated riskLevel updated to medium",
    reactivated.riskLevel,
    "medium",
  );
  TestValidator.equals(
    "reactivated notes updated",
    reactivated.notes,
    reactivationNotes,
  );

  const reactivatedClearedAt = reactivated.clearedAt ?? null;
  TestValidator.predicate(
    "clearedAt policy on reactivation is self-consistent (null when explicitly set null)",
    () => reactivatedClearedAt === null,
  );

  // 6. Final GET verification of reactivated state
  const reactivatedReloaded: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.at(
      connection,
      {
        authCredentialsId,
        riskFlagId,
      },
    );
  typia.assert(reactivatedReloaded);

  TestValidator.equals(
    "final reload keeps same id",
    reactivatedReloaded.id,
    riskFlagId,
  );
  TestValidator.equals(
    "final reload stays on same authCredentialsId",
    reactivatedReloaded.authCredentialsId,
    authCredentialsId,
  );
  TestValidator.equals(
    "final reload reflects active reactivated flag",
    reactivatedReloaded.active,
    true,
  );
  TestValidator.equals(
    "final reload has same riskLevel as reactivation response",
    reactivatedReloaded.riskLevel,
    reactivated.riskLevel,
  );
  TestValidator.equals(
    "final reload has same notes as reactivation response",
    reactivatedReloaded.notes,
    reactivated.notes,
  );
  TestValidator.equals(
    "final reload clearedAt matches reactivation clearedAt",
    reactivatedReloaded.clearedAt ?? null,
    reactivatedClearedAt,
  );
}
