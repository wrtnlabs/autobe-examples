import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validates the soft deletion and reactivation logic for discussion board
 * administrators.
 *
 * This scenario ensures that admin accounts can be soft deleted (deactivated)
 * and subsequently reactivated in compliance with platform business logic.
 *
 * Business context:
 *
 * - Admin accounts are privileged and need non-destructive deletion for
 *   audit/compliance.
 * - Soft delete is represented by setting deleted_at to a valid ISO 8601 datetime
 *   string.
 * - Reactivation is performed by setting deleted_at back to null.
 * - Profile updates should always return the current profile with correct fields.
 *
 * Workflow steps:
 *
 * 1. Register (join) a new admin with random valid email/password/session info.
 * 2. Confirm the admin is created with deleted_at === null.
 * 3. Soft delete the admin by updating their deleted_at field to now (an ISO
 *    date-time string).
 * 4. Confirm that deleted_at is now set and account is considered deactivated.
 * 5. Reactivate the admin by updating deleted_at to null.
 * 6. Confirm that deleted_at is null again, profile updates, and updated_at is
 *    modified.
 */
export async function test_api_admin_soft_delete_and_reactivation(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/admin-join",
    referrer: "https://example.com/landing",
    // ip is optional: omit for random/auto-detection
  } satisfies IDiscussionBoardAdmin.IJoin;
  const joinResult: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinInput });
  typia.assert(joinResult);

  // 2. Assert joined admin is active (not deleted)
  TestValidator.equals(
    "admin created with deleted_at null",
    joinResult.deleted_at,
    null,
  );

  // 3. Soft delete admin by updating deleted_at
  const now = new Date().toISOString();
  const softDeleted = await api.functional.discussionBoard.admin.admins.update(
    connection,
    {
      adminId: joinResult.id,
      body: { deleted_at: now } satisfies IDiscussionBoardAdmin.IUpdate,
    },
  );
  typia.assert(softDeleted);
  TestValidator.notEquals(
    "admin soft deleted (deleted_at set)",
    softDeleted.deleted_at,
    null,
  );
  TestValidator.equals(
    "admin deleted_at matches requested time",
    softDeleted.deleted_at,
    now,
  );

  // 4. Reactivate admin by clearing deleted_at
  const reactivated = await api.functional.discussionBoard.admin.admins.update(
    connection,
    {
      adminId: joinResult.id,
      body: { deleted_at: null } satisfies IDiscussionBoardAdmin.IUpdate,
    },
  );
  typia.assert(reactivated);
  TestValidator.equals(
    "admin reactivated (deleted_at null)",
    reactivated.deleted_at,
    null,
  );
  // updated_at should have been modified since creation
  TestValidator.notEquals(
    "updated_at advanced on reactivation",
    reactivated.updated_at,
    joinResult.updated_at,
  );
}
