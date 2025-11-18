import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Verify that an admin can toggle activation and expiration lifecycle of an
 * account risk flag via the update endpoint.
 *
 * Business goals validated by this test:
 *
 * 1. An authenticated admin can create an account risk flag and receive a fully
 *    populated IShoppingMallAccountRiskFlag entity.
 * 2. Using the update endpoint, the admin can deactivate the flag and assign a
 *    future expiration timestamp while keeping core attributes such as
 *    `actor_type` and `code` unchanged when omitted in the update payload.
 * 3. The admin can then reactivate the same flag and clear its expiration
 *    (`expires_at` set back to null), again without disturbing other
 *    attributes.
 * 4. Audit-related timestamps behave consistently: `created_at` is stable, while
 *    `updated_at` changes on each update.
 */
export async function test_api_admin_account_risk_flag_update_toggle_activation_and_expiration(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain admin Authorization context.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a baseline risk flag: active=true, expires_at=null.
  const createBody = {
    actor_type: "customer",
    code: "HIGH_REFUND_RATE",
    reason: "Customer has an unusually high refund rate over the last 90 days.",
    severity: "high",
    active: true,
    expires_at: null,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const createdFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallAccountRiskFlag>(createdFlag);

  // Basic assertions on initial state.
  TestValidator.equals(
    "initial flag should be active",
    createdFlag.active,
    true,
  );
  TestValidator.equals(
    "initial flag should be non-expiring (expires_at null)",
    createdFlag.expires_at ?? null,
    null,
  );

  const originalId = createdFlag.id;
  const originalActorType = createdFlag.actor_type;
  const originalCode = createdFlag.code;
  const originalSeverity = createdFlag.severity;
  const originalCreatedAt = createdFlag.created_at;
  const originalUpdatedAt = createdFlag.updated_at;
  const originalDeletedAt = createdFlag.deleted_at ?? null;

  // 3. First update: deactivate and set a specific future expiration.
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days later
  const futureIso = futureDate.toISOString();

  const firstUpdateBody = {
    active: false,
    expires_at: futureIso,
  } satisfies IShoppingMallAccountRiskFlag.IUpdate;

  const updatedFlag1 =
    await api.functional.shoppingMall.admin.accountRiskFlags.update(
      connection,
      {
        riskFlagId: originalId,
        body: firstUpdateBody,
      },
    );
  typia.assert<IShoppingMallAccountRiskFlag>(updatedFlag1);

  // Validate first update behavior.
  TestValidator.equals(
    "first update should keep same id",
    updatedFlag1.id,
    originalId,
  );
  TestValidator.equals(
    "first update should keep actor_type unchanged",
    updatedFlag1.actor_type,
    originalActorType,
  );
  TestValidator.equals(
    "first update should keep code unchanged",
    updatedFlag1.code,
    originalCode,
  );
  TestValidator.equals(
    "first update should keep severity unchanged",
    updatedFlag1.severity,
    originalSeverity,
  );
  TestValidator.equals(
    "first update should deactivate the flag",
    updatedFlag1.active,
    false,
  );
  TestValidator.equals(
    "first update should set expires_at to future timestamp",
    updatedFlag1.expires_at,
    futureIso,
  );
  TestValidator.equals(
    "created_at should remain stable after first update",
    updatedFlag1.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should change after first update",
    updatedFlag1.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "deleted_at should remain unchanged after first update",
    updatedFlag1.deleted_at ?? null,
    originalDeletedAt,
  );

  // 4. Second update: reactivate and clear expiration (expires_at=null).
  const secondUpdateBody = {
    active: true,
    expires_at: null,
  } satisfies IShoppingMallAccountRiskFlag.IUpdate;

  const updatedFlag2 =
    await api.functional.shoppingMall.admin.accountRiskFlags.update(
      connection,
      {
        riskFlagId: originalId,
        body: secondUpdateBody,
      },
    );
  typia.assert<IShoppingMallAccountRiskFlag>(updatedFlag2);

  // Validate second update behavior.
  TestValidator.equals(
    "second update should keep same id",
    updatedFlag2.id,
    originalId,
  );
  TestValidator.equals(
    "second update should keep actor_type unchanged",
    updatedFlag2.actor_type,
    originalActorType,
  );
  TestValidator.equals(
    "second update should keep code unchanged",
    updatedFlag2.code,
    originalCode,
  );
  TestValidator.equals(
    "second update should keep severity unchanged",
    updatedFlag2.severity,
    originalSeverity,
  );
  TestValidator.equals(
    "second update should reactivate the flag",
    updatedFlag2.active,
    true,
  );
  TestValidator.equals(
    "second update should clear expires_at back to null",
    updatedFlag2.expires_at ?? null,
    null,
  );
  TestValidator.equals(
    "created_at should remain stable after second update",
    updatedFlag2.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should change again after second update",
    updatedFlag2.updated_at,
    updatedFlag1.updated_at,
  );
  TestValidator.equals(
    "deleted_at should remain unchanged after second update",
    updatedFlag2.deleted_at ?? null,
    originalDeletedAt,
  );
}
