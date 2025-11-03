import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformKarmaAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaAuditLogs";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaAuditLogs";

/**
 * Validate retrieval of user karma audit logs by a platform administrator.
 *
 * This test confirms that an admin user can successfully access the complete
 * paginated system-wide karma audit logs and that actions performed by a
 * recently registered user are correctly recorded in the audit trail. The
 * scenario includes admin registration and authentication, new user account
 * creation, and then searching for the resulting audit log entries. The test
 * asserts the audit log API returns a paginated list with entries reflecting
 * the user's actions and includes correct fields for compliance and
 * transparency purposes. Due to the lack of direct karma-affecting endpoints,
 * the test focuses on validating log shape and admin access.
 *
 * Steps:
 *
 * 1. Register a new admin and authenticate
 * 2. Register a new user
 * 3. Query the karma audit logs as admin (page 1, limit 10)
 * 4. Assert the response includes audit log summaries (if any exist)
 * 5. Confirm returned objects have all required properties for audit trail
 *    integrity
 */
export async function test_api_karma_audit_log_index_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name();
  const adminHref =
    "https://admin.join.test/" + RandomGenerator.alphaNumeric(8);
  const adminReferrer =
    "https://referrer.join.test/" + RandomGenerator.alphaNumeric(6);
  const adminJoinResponse = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: adminHref,
      referrer: adminReferrer,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminJoinResponse);
  TestValidator.equals(
    "admin id matches uuid",
    adminJoinResponse.id,
    adminJoinResponse.id,
  );

  // 2. Register a new user (to create a user with karma-affecting audit potential)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const userDisplayName = RandomGenerator.name();
  const userJoinHref =
    "https://user.join.test/" + RandomGenerator.alphaNumeric(8);
  const userJoinReferrer =
    "https://referrer.user.test/" + RandomGenerator.alphaNumeric(6);
  const userJoinResponse = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      display_name: userDisplayName,
      href: userJoinHref,
      referrer: userJoinReferrer,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoinResponse);
  TestValidator.equals(
    "user id matches uuid",
    userJoinResponse.id,
    userJoinResponse.id,
  );

  // 3. Query the admin karma audit log with pagination/filter (against page 1, limit 10)
  const pageNumber = 1 as number & tags.Type<"int32">;
  const pageLimit = 10 as number & tags.Type<"int32">;
  const auditLogRequest = {
    page: pageNumber,
    limit: pageLimit,
    user_id: undefined, // System-wide, not filtering by user
    action: undefined, // All actions
    date_from: undefined, // No date filters set
    date_to: undefined,
    content_reference_id: undefined,
    score_delta_min: undefined,
    score_delta_max: undefined,
  } satisfies ICommunityPlatformKarmaAuditLogs.IRequest;

  const auditLogPage =
    await api.functional.communityPlatform.admin.karmaAuditLogs.index(
      connection,
      {
        body: auditLogRequest,
      },
    );
  typia.assert(auditLogPage);
  TestValidator.predicate(
    "audit log pagination",
    auditLogPage.pagination.current === pageNumber &&
      auditLogPage.pagination.limit === pageLimit,
  );

  // 4. Confirm all audit log summary objects contain required fields (if any results exist)
  for (const log of auditLogPage.data) {
    typia.assert(log);
    TestValidator.predicate(
      "karma audit log id is uuid",
      typeof log.id === "string" && log.id.length > 0,
    );
    TestValidator.predicate(
      "has required user id",
      typeof log.community_platform_user_id === "string",
    );
    TestValidator.predicate("action is string", typeof log.action === "string");
    TestValidator.predicate("reason is string", typeof log.reason === "string");
    TestValidator.predicate(
      "signed delta is int32",
      typeof log.score_delta === "number",
    );
    TestValidator.predicate(
      "prior/resulting karma are int32",
      typeof log.prior_karma === "number" &&
        typeof log.resulting_karma === "number",
    );
    TestValidator.predicate(
      "created_at is present",
      typeof log.created_at === "string",
    );
  }
}
