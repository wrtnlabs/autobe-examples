import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

/**
 * Test combining multiple filters in audit log queries.
 *
 * This test validates the audit log system's ability to handle complex
 * compliance and investigation queries by applying multiple filter criteria
 * simultaneously. The test ensures that results match ALL specified filter
 * criteria (AND logic between filters).
 *
 * Workflow:
 *
 * 1. Authenticate as administrator
 * 2. Query audit logs with multiple filters (action_type, action_status, date
 *    range)
 * 3. Verify paginated results contain only logs matching all criteria
 * 4. Validate response structure includes moderator and member information
 * 5. Confirm combined filtering produces correct subset of audit logs
 */
export async function test_api_moderation_audit_logs_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphabets(12),
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: null,
    ip: null,
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator authenticated successfully",
    !!admin.id,
  );

  // Step 2: Query audit logs with multiple combined filters
  // Create a request with multiple filter criteria: action_type, action_status, and date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filterRequest = {
    page: 1,
    limit: 20,
    action_type: "ban_user" as const,
    action_status: "success" as const,
    created_at_from: thirtyDaysAgo.toISOString(),
    created_at_to: now.toISOString(),
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const auditLogResponse =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: filterRequest,
      },
    );
  typia.assert(auditLogResponse);

  // Step 3: Verify response structure
  TestValidator.predicate(
    "audit log response contains pagination info",
    !!auditLogResponse.pagination && auditLogResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "audit log response contains data array",
    Array.isArray(auditLogResponse.data),
  );

  // Step 4: Validate all returned logs match the combined filter criteria
  auditLogResponse.data.forEach((log) => {
    typia.assert(log);

    // Verify action_type matches filter
    TestValidator.equals(
      "log action_type matches filter",
      log.action_type,
      "ban_user",
    );

    // Verify action_status matches filter
    TestValidator.equals(
      "log action_status matches filter",
      log.action_status,
      "success",
    );

    // Verify created_at is within date range
    const logCreatedTime = new Date(log.created_at).getTime();
    TestValidator.predicate(
      "log created_at is >= created_at_from",
      logCreatedTime >= thirtyDaysAgo.getTime(),
    );
    TestValidator.predicate(
      "log created_at is <= created_at_to",
      logCreatedTime <= now.getTime(),
    );

    // Verify moderator information is present
    TestValidator.predicate(
      "log contains moderator information",
      !!log.moderator && !!log.moderator.id && !!log.moderator.username,
    );

    // For ban_user action on user targets, targetMember should be present
    if (log.target_type === "user") {
      TestValidator.predicate(
        "user target logs contain member information",
        log.targetMember !== null && log.targetMember !== undefined,
      );
    }
  });

  // Step 5: Verify pagination information is correct
  TestValidator.predicate(
    "pagination current page matches request",
    auditLogResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    auditLogResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    auditLogResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    auditLogResponse.pagination.pages >= 0,
  );

  // Step 6: Test with different page to validate pagination works with filters
  const secondPageRequest = {
    page: 2,
    limit: 20,
    action_type: "ban_user" as const,
    action_status: "success" as const,
    created_at_from: thirtyDaysAgo.toISOString(),
    created_at_to: now.toISOString(),
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const secondPageResponse =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: secondPageRequest,
      },
    );
  typia.assert(secondPageResponse);

  TestValidator.predicate(
    "second page response is valid",
    !!secondPageResponse.pagination && Array.isArray(secondPageResponse.data),
  );
  TestValidator.equals(
    "second page number matches request",
    secondPageResponse.pagination.current,
    2,
  );

  // Step 7: Verify combined filtering is effective by checking a narrower filter produces different results
  const narrowerRequest = {
    page: 1,
    limit: 20,
    action_type: "ban_user" as const,
    action_status: "failed" as const, // Different status
    created_at_from: thirtyDaysAgo.toISOString(),
    created_at_to: now.toISOString(),
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const narrowerResponse =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: narrowerRequest,
      },
    );
  typia.assert(narrowerResponse);

  // Verify all logs in narrower response match the new status filter
  narrowerResponse.data.forEach((log) => {
    TestValidator.equals(
      "narrower filter log action_status matches",
      log.action_status,
      "failed",
    );
  });
}
