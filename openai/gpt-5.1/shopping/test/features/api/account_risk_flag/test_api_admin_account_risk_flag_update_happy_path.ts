import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate happy-path update of an existing shopping mall account risk flag by
 * an authenticated admin.
 *
 * Business flow:
 *
 * 1. Register a new admin via POST /auth/admin/join and obtain authenticated
 *    context (Authorization header set automatically).
 * 2. Create a baseline account risk flag via POST
 *    /shoppingMall/admin/accountRiskFlags using
 *    IShoppingMallAccountRiskFlag.ICreate.
 * 3. Update the created risk flag via PUT
 *    /shoppingMall/admin/accountRiskFlags/{riskFlagId} using
 *    IShoppingMallAccountRiskFlag.IUpdate changing severity, reason, active,
 *    and expires_at.
 * 4. Assert that identity fields (id) and created_at remain unchanged, updated_at
 *    is advanced, and business fields reflect requested updates while untouched
 *    fields stay the same.
 */
export async function test_api_admin_account_risk_flag_update_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a baseline account risk flag
  const initialExpiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const createBody = {
    actor_type: "customer",
    code: "SUSPICIOUS_ACTIVITY",
    severity: "medium",
    active: true,
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    expires_at: initialExpiresAt,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const createdFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdFlag);

  // Capture original state for later comparison
  const originalId = createdFlag.id;
  const originalActorType = createdFlag.actor_type;
  const originalCode = createdFlag.code;
  const originalSeverity = createdFlag.severity;
  const originalReason = createdFlag.reason ?? null;
  const originalActive = createdFlag.active;
  const originalExpiresAt = createdFlag.expires_at ?? null;
  const originalCreatedAt = createdFlag.created_at;
  const originalUpdatedAt = createdFlag.updated_at;
  const originalDeletedAt = createdFlag.deleted_at ?? null;

  // 3. Update the risk flag: change severity, reason, active, expires_at
  const newExpiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 48 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const updatedReason = RandomGenerator.paragraph({ sentences: 5 });

  const updateBody = {
    severity: "high",
    reason: updatedReason,
    active: false,
    expires_at: newExpiresAt,
  } satisfies IShoppingMallAccountRiskFlag.IUpdate;

  const updatedFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.update(
      connection,
      {
        riskFlagId: createdFlag.id,
        body: updateBody,
      },
    );
  typia.assert(updatedFlag);

  // 4. Assertions
  // 4.1 Identity invariants
  TestValidator.equals(
    "risk flag id should remain unchanged after update",
    updatedFlag.id,
    originalId,
  );

  // 4.2 Actor type and code should not change when not included in update body
  TestValidator.equals(
    "actor_type should remain unchanged",
    updatedFlag.actor_type,
    originalActorType,
  );
  TestValidator.equals(
    "code should remain unchanged",
    updatedFlag.code,
    originalCode,
  );

  // 4.3 created_at must remain the same
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedFlag.created_at,
    originalCreatedAt,
  );

  // 4.4 updated_at should advance
  const originalUpdatedAtMs = Date.parse(originalUpdatedAt);
  const newUpdatedAtMs = Date.parse(updatedFlag.updated_at);
  TestValidator.predicate(
    "updated_at should be strictly later than original updated_at",
    newUpdatedAtMs > originalUpdatedAtMs,
  );

  // 4.5 Business field changes
  TestValidator.equals(
    "severity should be updated to high",
    updatedFlag.severity,
    "high",
  );
  TestValidator.notEquals(
    "severity should differ from original",
    updatedFlag.severity,
    originalSeverity,
  );

  TestValidator.equals(
    "reason should be updated to the new value",
    updatedFlag.reason ?? null,
    updatedReason,
  );
  TestValidator.notEquals(
    "reason should differ from original",
    updatedFlag.reason ?? null,
    originalReason,
  );

  TestValidator.equals(
    "active should be updated to false",
    updatedFlag.active,
    false,
  );
  TestValidator.notEquals(
    "active should differ from original",
    updatedFlag.active,
    originalActive,
  );

  TestValidator.equals(
    "expires_at should be updated to new future date",
    updatedFlag.expires_at ?? null,
    newExpiresAt,
  );
  TestValidator.notEquals(
    "expires_at should differ from original value",
    updatedFlag.expires_at ?? null,
    originalExpiresAt,
  );

  // 4.6 deleted_at should remain null/unchanged on happy-path update
  TestValidator.equals(
    "deleted_at should remain unchanged (typically null)",
    updatedFlag.deleted_at ?? null,
    originalDeletedAt,
  );
}
