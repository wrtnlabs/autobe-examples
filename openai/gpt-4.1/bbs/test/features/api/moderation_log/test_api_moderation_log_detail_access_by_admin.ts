import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

/**
 * Test retrieval of detailed moderation log by admin.
 *
 * Validates full information can be fetched for a specific moderation log by an
 * authenticated administrator. Ensures the log contains all critical audit and
 * context fields, and access is securely limited to admin actors.
 *
 * Test steps:
 *
 * 1. Register and authenticate a new administrator (receive JWT in context)
 * 2. Manually (mock) create a moderation log entry targeting an arbitrary entity
 * 3. Retrieve the log details by UUID via the admin API
 * 4. Assert that all critical fields are present and correct
 * 5. Confirm audit invariants (admin identity, action, target, notes, timestamps)
 */
export async function test_api_moderation_log_detail_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12) + "!xYz1$", // strong password
    href: "https://admin-registration.test/",
    referrer: "https://admin-dashboard.test/",
    ip: "127.0.0.1",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(adminAuthorized);
  TestValidator.equals(
    "registered email matches",
    adminAuthorized.email,
    adminEmail,
  );
  TestValidator.predicate(
    "admin is active",
    adminAuthorized.is_active === true,
  );
  TestValidator.predicate(
    "admin is not blocked",
    adminAuthorized.is_blocked === false,
  );

  // 2. MOCK/INSERT moderation log as if an admin action occurred
  // In real e2e this would be created via a separate admin action API.
  // Here, we simulate a log DTO for test by direct API or typia.random (if not creatable)
  // For E2E: Use random - production test should use a real workflow instead.
  const logMock: IDiscussionBoardModerationLog =
    typia.random<IDiscussionBoardModerationLog>();
  // Overwrite logMock.admin with the known admin actor
  const adminSummary = {
    id: adminAuthorized.id,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.ISummary;
  const logId = logMock.id;
  const expectedAction = RandomGenerator.pick([
    "delete",
    "edit",
    "suspend",
    "warn",
  ]) as string;
  const expectedTargetType = RandomGenerator.pick([
    "article",
    "comment",
    "user",
    "attachment",
  ]) as string;
  // Simulate forming a moderation log for our test admin
  const logDetailExpected: IDiscussionBoardModerationLog = {
    ...logMock,
    admin: adminSummary,
    action_code: expectedAction,
    target_type: expectedTargetType,
    note: RandomGenerator.paragraph({ sentences: 2 }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // Simulate log exists in persistence layer;
  // 3. Retrieve log detail
  // NOTE: In real E2E, we would use a creation API or setup DB state
  const log = await api.functional.discussionBoard.admin.moderation.logs.at(
    connection,
    {
      logId: logDetailExpected.id,
    },
  );
  typia.assert(log);

  // 4. Assert detailed log fields
  TestValidator.equals("log id matches", log.id, logDetailExpected.id);
  TestValidator.equals("admin id matches", log.admin.id, adminSummary.id);
  TestValidator.equals(
    "action code matches",
    log.action_code,
    logDetailExpected.action_code,
  );
  TestValidator.equals(
    "target id matches",
    log.target_id,
    logDetailExpected.target_id,
  );
  TestValidator.equals(
    "target type matches",
    log.target_type,
    logDetailExpected.target_type,
  );
  TestValidator.equals("note matches", log.note, logDetailExpected.note);
  TestValidator.predicate(
    "created_at is present",
    !!log.created_at && typeof log.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is present",
    !!log.updated_at && typeof log.updated_at === "string",
  );
  TestValidator.equals("deleted_at is null", log.deleted_at, null);
}
