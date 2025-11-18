import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Ensure account risk flag detail reflects latest updates over time.
 *
 * Business goal: Validate that the admin-facing detail endpoint GET
 * /shoppingMall/admin/accountRiskFlags/{riskFlagId} always returns the most
 * recent persisted state of a risk flag after it has been updated via the
 * corresponding update endpoint.
 *
 * Scenario steps:
 *
 * 1. Join as an admin using POST /auth/admin/join to obtain an authorized admin
 *    session (the SDK handles Authorization header automatically).
 * 2. Create an initial account risk flag using POST
 *    /shoppingMall/admin/accountRiskFlags with
 *    IShoppingMallAccountRiskFlag.ICreate.
 * 3. Immediately fetch the created flag using GET
 *    /shoppingMall/admin/accountRiskFlags/{riskFlagId} and capture its baseline
 *    fields and timestamps.
 * 4. Update the same risk flag using PUT
 *    /shoppingMall/admin/accountRiskFlags/{riskFlagId} with
 *    IShoppingMallAccountRiskFlag.IUpdate, changing severity, active, reason,
 *    and expires_at.
 * 5. Re-fetch the risk flag via GET detail and verify that:
 *
 *    - The business fields (severity, active, reason, expires_at) match the update
 *         payload exactly.
 *    - Created_at remains identical to the original value.
 *    - Updated_at is strictly later than the original updated_at, proving that the
 *         system-managed timestamp reflects the update.
 */
export async function test_api_account_risk_flag_detail_reflects_updates_over_time(
  connection: api.IConnection,
) {
  // 1. Join as admin to get authorized connection
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create an initial risk flag
  const createBody = {
    actor_type: "customer",
    code: RandomGenerator.alphaNumeric(12),
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    severity: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "critical",
    ] as const),
    active: true,
    // keep expires_at undefined initially
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const created: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Fetch the created flag detail (baseline)
  const baseline: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.at(connection, {
      riskFlagId: created.id,
    });
  typia.assert(baseline);

  // Sanity check: baseline should match creation for key fields
  TestValidator.equals(
    "baseline id matches created id",
    baseline.id,
    created.id,
  );
  TestValidator.equals(
    "baseline actor_type matches created actor_type",
    baseline.actor_type,
    createBody.actor_type,
  );
  TestValidator.equals(
    "baseline code matches created code",
    baseline.code,
    createBody.code,
  );
  TestValidator.equals(
    "baseline severity matches created severity",
    baseline.severity,
    createBody.severity,
  );
  TestValidator.equals(
    "baseline active matches created active",
    baseline.active,
    createBody.active,
  );
  TestValidator.equals(
    "baseline reason matches created reason",
    baseline.reason ?? null,
    createBody.reason ?? null,
  );

  const originalCreatedAt = baseline.created_at;
  const originalUpdatedAt = baseline.updated_at;

  // 4. Update the risk flag with new values
  const newSeverity = RandomGenerator.pick([
    "low",
    "medium",
    "high",
    "critical",
  ] as const);
  const newActive = false;
  const newReason = RandomGenerator.paragraph({ sentences: 6 });
  const newExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const updateBody = {
    severity: newSeverity,
    active: newActive,
    reason: newReason,
    expires_at: newExpiresAt,
  } satisfies IShoppingMallAccountRiskFlag.IUpdate;

  const updated: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.update(
      connection,
      {
        riskFlagId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Fetch detail again and validate it reflects the updated state
  const detailAfterUpdate: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.at(connection, {
      riskFlagId: created.id,
    });
  typia.assert(detailAfterUpdate);

  // Ensure created_at is stable
  TestValidator.equals(
    "created_at remains unchanged after update",
    detailAfterUpdate.created_at,
    originalCreatedAt,
  );

  // Ensure updated_at has advanced
  TestValidator.predicate(
    "updated_at is later after update",
    new Date(detailAfterUpdate.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );

  // Ensure detail reflects the new business fields
  TestValidator.equals(
    "detail severity reflects updated severity",
    detailAfterUpdate.severity,
    newSeverity,
  );
  TestValidator.equals(
    "detail active reflects updated active",
    detailAfterUpdate.active,
    newActive,
  );
  TestValidator.equals(
    "detail reason reflects updated reason",
    detailAfterUpdate.reason ?? null,
    newReason,
  );
  TestValidator.equals(
    "detail expires_at reflects updated expires_at",
    detailAfterUpdate.expires_at ?? null,
    newExpiresAt,
  );
}
