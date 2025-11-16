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
 * Validate that a platform admin can update severity and notes of an active
 * risk flag.
 *
 * Business context:
 *
 * - Risk flags represent fraud/risk assessments attached to auth credentials.
 * - Platform admins can escalate severity, tweak reason categories, and add
 *   investigation notes without clearing (deactivating) the flag.
 *
 * Steps:
 *
 * 1. Join as a new platform admin via POST /auth/platformAdmin/join to establish
 *    an authorized platform-admin session. The SDK will attach the
 *    Authorization header automatically using the
 *    IShoppingMallPlatformAdmin.IAuthorized.token.
 * 2. Create an initial active risk flag using POST
 *    /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags.
 *
 *    - We cannot directly query the auth credentials ID from join, but the created
 *         IShoppingMallRiskFlag includes `authCredentialsId`, which we can use
 *         as the path parameter for subsequent operations.
 *    - The IShoppingMallRiskFlag.ICreate body should include:
 *
 *         - Code: a machine-readable code (e.g., "suspicious_login_pattern")
 *         - ReasonCategory: a category string (e.g., "suspected_fraud")
 *         - RiskLevel: a severity string (e.g., "medium")
 *         - Message: human-readable explanation
 *         - Active: true
 *         - ExpiresAt: optional ISO 8601 string or null
 *         - Notes: optional string or null
 * 3. Capture the returned IShoppingMallRiskFlag from create:
 *
 *    - Store flag.id as riskFlagId
 *    - Store flag.authCredentialsId as authCredentialsId
 * 4. Build an IShoppingMallRiskFlag.IUpdate payload that:
 *
 *    - Changes riskLevel from the initial value (e.g., "medium") to a different
 *         value (e.g., "high")
 *    - Changes reasonCategory to a different value (e.g., from "suspected_fraud" to
 *         "chargeback_history")
 *    - Updates notes to a new investigation note
 *    - Sets active: true (to ensure the flag remains active)
 *    - Leaves clearedAt undefined or explicitly null (so we don’t clear the flag)
 * 5. Call PUT
 *    /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags/{riskFlagId}
 *    with the update payload and capture the updated IShoppingMallRiskFlag.
 * 6. Assert with typia.assert that the updated flag response is structurally
 *    valid.
 * 7. Business assertions using TestValidator:
 *
 *    - Id is unchanged between created and updated flags.
 *    - AuthCredentialsId is unchanged.
 *    - CreatedAt is unchanged (immutable creation timestamp).
 *    - UpdatedAt is different from the original created flag’s updatedAt (or at
 *         least not earlier), but we only check inequality to avoid brittle
 *         timestamp ordering.
 *    - RiskLevel has changed to the new severity string.
 *    - ReasonCategory has changed to the new category string.
 *    - Notes has changed to the new notes string.
 *    - Active remains true.
 *    - ClearedAt is still null (flag has not been cleared).
 * 8. Call GET
 *    /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags/{riskFlagId}
 *    and assert that it matches the updated flag (same id, authCredentialsId,
 *    riskLevel, reasonCategory, notes, active, clearedAt).
 */
export async function test_api_platform_admin_updates_active_risk_flag_severity_and_notes(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial active risk flag
  const initialCode = "suspicious_login_pattern";
  const initialReasonCategory = "suspected_fraud";
  const initialRiskLevel = "medium";
  const initialNotes = RandomGenerator.paragraph({ sentences: 3 });

  const createBody = {
    code: initialCode,
    reasonCategory: initialReasonCategory,
    riskLevel: initialRiskLevel,
    message: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    expiresAt: null,
    notes: initialNotes,
  } satisfies IShoppingMallRiskFlag.ICreate;

  // Since we do not know the admin's authCredentialsId explicitly, we can
  // use a random UUID for the path, and we will still get an IShoppingMallRiskFlag
  // response whose authCredentialsId is authoritative for subsequent operations.
  const createdFlag: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId: typia.random<string & tags.Format<"uuid">>(),
        body: createBody,
      },
    );
  typia.assert(createdFlag);

  const authCredentialsId = createdFlag.authCredentialsId;
  const riskFlagId = createdFlag.id;

  // 3. Prepare update payload to escalate risk and update notes
  const updatedRiskLevel = "high";
  const updatedReasonCategory = "chargeback_history";
  const updatedNotes = RandomGenerator.paragraph({ sentences: 4 });

  const updateBody = {
    riskLevel: updatedRiskLevel,
    reasonCategory: updatedReasonCategory,
    active: true,
    notes: updatedNotes,
    clearedAt: null,
  } satisfies IShoppingMallRiskFlag.IUpdate;

  const updatedFlag: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.update(
      connection,
      {
        authCredentialsId,
        riskFlagId,
        body: updateBody,
      },
    );
  typia.assert(updatedFlag);

  // 4. Business assertions on updated flag
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
  TestValidator.equals(
    "createdAt must remain unchanged after update",
    updatedFlag.createdAt,
    createdFlag.createdAt,
  );
  TestValidator.notEquals(
    "updatedAt should change after update",
    updatedFlag.updatedAt,
    createdFlag.updatedAt,
  );
  TestValidator.equals(
    "riskLevel should be escalated to updated value",
    updatedFlag.riskLevel,
    updatedRiskLevel,
  );
  TestValidator.equals(
    "reasonCategory should be updated",
    updatedFlag.reasonCategory,
    updatedReasonCategory,
  );
  TestValidator.equals(
    "notes should be updated",
    updatedFlag.notes,
    updatedNotes,
  );
  TestValidator.predicate(
    "risk flag must remain active after update",
    updatedFlag.active === true,
  );
  TestValidator.equals(
    "clearedAt must remain null for an active, not-cleared flag",
    updatedFlag.clearedAt,
    null,
  );

  // 5. Re-fetch via GET to confirm persistence
  const reloadedFlag: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.at(
      connection,
      {
        authCredentialsId,
        riskFlagId,
      },
    );
  typia.assert(reloadedFlag);

  TestValidator.equals(
    "reloaded flag should match updated flag state",
    reloadedFlag,
    updatedFlag,
  );
}
