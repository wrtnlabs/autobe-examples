import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate that admin user detail reflects profile/status updates consistently.
 *
 * Business context: Administrative users in the todoApp service can be created
 * via the authentication join endpoint, then later managed via dedicated admin
 * CRUD APIs. A common backoffice flow is: create an admin, adjust their
 * profile/status using an update endpoint, and read them back using a detail
 * endpoint.
 *
 * This test verifies that when an admin user (Admin A) updates mutable fields
 * like display_name and status through the update endpoint, the subsequent GET
 * detail call returns an ITodoAppAdminUser whose fields are consistent with
 * both the update operation and immutable identity semantics.
 *
 * Steps:
 *
 * 1. Register an admin user via POST /auth/adminUser/join and capture the
 *    resulting ITodoAppAdminUser.IAuthorized payload.
 * 2. Build an ITodoAppAdminUser.IUpdate payload that changes
 *
 *    - Display_name to a new non-null value, and
 *    - Status to a new string value distinct from the original status.
 * 3. Call PUT /todoApp/adminUser/adminUsers/{adminUserId} with the captured id and
 *    update body, capturing the ITodoAppAdminUser response (updatedUser).
 * 4. Call GET /todoApp/adminUser/adminUsers/{adminUserId} for the same id,
 *    capturing the ITodoAppAdminUser response (detailUser).
 * 5. Assert that:
 *
 *    - DetailUser.display_name equals the new display_name.
 *    - DetailUser.status equals the new status.
 *    - DetailUser.id equals the original id.
 *    - DetailUser.email equals the original email (no email change).
 *    - DetailUser.created_at equals the original created_at.
 *    - UpdatedUser.updated_at and detailUser.updated_at are greater than or equal to
 *         the original updated_at and equal to each other.
 *    - Failed_login_count, last_login_at, deleted_at are identical between
 *         updatedUser and detailUser.
 */
export async function test_api_admin_user_detail_consistency_after_update(
  connection: api.IConnection,
) {
  // 1. Register an admin user (Admin A)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinInput,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorized);

  const originalId = authorized.id;
  const originalEmail = authorized.email;
  const originalDisplayName = authorized.display_name ?? null;
  const originalStatus = authorized.status;
  const originalFailedLoginCount = authorized.failed_login_count;
  const originalLastLoginAt =
    authorized.last_login_at !== undefined ? authorized.last_login_at : null;
  const originalCreatedAt = authorized.created_at;
  const originalUpdatedAt = authorized.updated_at;
  const originalDeletedAt =
    authorized.deleted_at !== undefined ? authorized.deleted_at : null;

  // 2. Prepare update payload: change display_name and status
  const newDisplayName = RandomGenerator.name();

  // Derive a different status string from the original using a small
  // finite set of candidate statuses. Fallback to a generic value if
  // original does not match any known candidate.
  const candidateStatuses = [
    "active",
    "inactive",
    "disabled",
    "suspended",
  ] as const;

  const fallbackStatus = "active";
  const baseNewStatus = (() => {
    const normalizedOriginal = originalStatus.toLowerCase();
    const matched = candidateStatuses.find(
      (s) => s.toLowerCase() === normalizedOriginal,
    );
    if (matched === undefined) return fallbackStatus;
    const others = candidateStatuses.filter((s) => s !== matched);
    return others.length > 0 ? RandomGenerator.pick(others) : fallbackStatus;
  })();

  const updateBody = {
    display_name: newDisplayName,
    status: baseNewStatus,
  } satisfies ITodoAppAdminUser.IUpdate;

  // 3. Call update endpoint
  const updatedUser: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.update(connection, {
      adminUserId: originalId,
      body: updateBody,
    });
  typia.assert<ITodoAppAdminUser>(updatedUser);

  // 4. Call detail endpoint
  const detailUser: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.at(connection, {
      adminUserId: originalId,
    });
  typia.assert<ITodoAppAdminUser>(detailUser);

  // 5. Consistency assertions

  // Updated fields
  TestValidator.equals(
    "detail.display_name should match updated display_name",
    detailUser.display_name ?? null,
    newDisplayName,
  );
  TestValidator.equals(
    "detail.status should match updated status",
    detailUser.status,
    baseNewStatus,
  );

  // Immutable identity fields
  TestValidator.equals("id must remain unchanged", detailUser.id, originalId);
  TestValidator.equals(
    "email must remain unchanged",
    detailUser.email,
    originalEmail,
  );
  TestValidator.equals(
    "created_at must remain original",
    detailUser.created_at,
    originalCreatedAt,
  );

  // Audit fields: updated_at should advance, and be same in update & detail
  TestValidator.predicate(
    "updated_at must be >= original updated_at",
    detailUser.updated_at >= originalUpdatedAt,
  );
  TestValidator.equals(
    "updated_at should match between update and detail",
    updatedUser.updated_at,
    detailUser.updated_at,
  );

  // Other fields integrity: failed_login_count, last_login_at, deleted_at
  TestValidator.equals(
    "failed_login_count should remain unchanged by profile update",
    detailUser.failed_login_count,
    originalFailedLoginCount,
  );

  const updatedLastLoginAt =
    updatedUser.last_login_at !== undefined ? updatedUser.last_login_at : null;
  const detailLastLoginAt =
    detailUser.last_login_at !== undefined ? detailUser.last_login_at : null;
  TestValidator.equals(
    "last_login_at should be consistent between update and detail",
    detailLastLoginAt,
    updatedLastLoginAt,
  );

  const updatedDeletedAt =
    updatedUser.deleted_at !== undefined ? updatedUser.deleted_at : null;
  const detailDeletedAt =
    detailUser.deleted_at !== undefined ? detailUser.deleted_at : null;
  TestValidator.equals(
    "deleted_at should be consistent between update and detail",
    detailDeletedAt,
    updatedDeletedAt,
  );

  // Also ensure deleted_at remains aligned with the original logical
  // deletion state when this test does not touch it.
  TestValidator.equals(
    "deleted_at should preserve original logical deletion state",
    detailDeletedAt,
    originalDeletedAt,
  );
}
