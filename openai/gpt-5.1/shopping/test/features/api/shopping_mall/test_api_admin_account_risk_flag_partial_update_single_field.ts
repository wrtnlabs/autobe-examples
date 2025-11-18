import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that an admin can partially update a single mutable field of an
 * existing account risk flag.
 *
 * Business goal
 *
 * - Ensure that PUT /shoppingMall/admin/accountRiskFlags/{riskFlagId} correctly
 *   handles a minimal IShoppingMallAccountRiskFlag.IUpdate payload that updates
 *   only one field (active), leveraging that all properties on IUpdate are
 *   optional.
 * - Confirm that only the specified field changes while all other attributes of
 *   the risk flag remain stable, aside from the system-managed updated_at.
 *
 * Steps
 *
 * 1. Register an admin via POST /auth/admin/join and establish an authenticated
 *    admin session.
 * 2. Create a baseline account risk flag with a full
 *    IShoppingMallAccountRiskFlag.ICreate payload.
 * 3. Call the update endpoint with an IShoppingMallAccountRiskFlag.IUpdate body
 *    that only supplies the active field, flipping its value from the
 *    original.
 * 4. Assert that:
 *
 *    - Id is unchanged.
 *    - Actor_type, code, severity, reason, expires_at, created_at, deleted_at are
 *         unchanged.
 *    - Active is updated to the new value.
 *    - Updated_at is different from the original updated_at and later in time.
 */
export async function test_api_admin_account_risk_flag_partial_update_single_field(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an authenticated session
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a baseline account risk flag
  const createBody = typia.random<IShoppingMallAccountRiskFlag.ICreate>();

  const original: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(original);

  // Preserve original snapshot for later comparison
  const originalId = original.id;
  const originalActorType = original.actor_type;
  const originalCode = original.code;
  const originalSeverity = original.severity;
  const originalReason = original.reason ?? null;
  const originalExpiresAt = original.expires_at ?? null;
  const originalActive = original.active;
  const originalCreatedAt = original.created_at;
  const originalUpdatedAt = original.updated_at;
  const originalDeletedAt =
    original.deleted_at === undefined ? undefined : original.deleted_at;

  // 3. Perform partial update: change only the `active` flag
  const nextActive = !originalActive;

  const updated: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.update(
      connection,
      {
        riskFlagId: originalId,
        body: {
          active: nextActive,
        } satisfies IShoppingMallAccountRiskFlag.IUpdate,
      },
    );
  typia.assert(updated);

  // 4. Business assertions
  // 4-1. Identity and stable fields must remain unchanged
  TestValidator.equals(
    "risk flag id remains unchanged after partial update",
    updated.id,
    originalId,
  );

  TestValidator.equals(
    "actor_type remains unchanged after partial update",
    updated.actor_type,
    originalActorType,
  );

  TestValidator.equals(
    "code remains unchanged after partial update",
    updated.code,
    originalCode,
  );

  TestValidator.equals(
    "severity remains unchanged after partial update",
    updated.severity,
    originalSeverity,
  );

  TestValidator.equals(
    "reason remains unchanged after partial update",
    updated.reason ?? null,
    originalReason,
  );

  TestValidator.equals(
    "expires_at remains unchanged after partial update",
    updated.expires_at ?? null,
    originalExpiresAt,
  );

  TestValidator.equals(
    "created_at remains unchanged after partial update",
    updated.created_at,
    originalCreatedAt,
  );

  // deleted_at is optional/nullable; normalize both sides for comparison
  const updatedDeletedAt =
    updated.deleted_at === undefined ? undefined : updated.deleted_at;
  TestValidator.equals(
    "deleted_at remains unchanged after partial update",
    updatedDeletedAt,
    originalDeletedAt,
  );

  // 4-2. Active flag must be updated
  TestValidator.equals(
    "active is updated to the new value after partial update",
    updated.active,
    nextActive,
  );

  // 4-3. updated_at must change and be later than the original value
  TestValidator.notEquals(
    "updated_at must change after partial update",
    updated.updated_at,
    originalUpdatedAt,
  );

  await TestValidator.predicate(
    "updated_at is later than original updated_at after partial update",
    async () => updated.updated_at > originalUpdatedAt,
  );
}
