import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

/**
 * Test filtering moderation audit logs by action_status (success, failed,
 * partial).
 *
 * Validates that filtering by different status values (success, failed,
 * partial) returns only audit entries with the corresponding action_status.
 * Confirms that status_details field provides additional context for failed
 * actions. Verifies that this filtering capability helps identify moderation
 * failures requiring investigation or remediation.
 *
 * Test steps:
 *
 * 1. Create a moderator account for authentication
 * 2. Query audit logs filtered by status='success'
 * 3. Query audit logs filtered by status='failed'
 * 4. Query audit logs filtered by status='partial'
 * 5. Validate that each response contains only entries matching the requested
 *    status
 * 6. Verify status_details field is populated for failed and partial entries
 */
export async function test_api_moderation_audit_logs_filter_by_status(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for authentication
  const moderatorCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(moderatorAuth);

  // Step 2: Query audit logs filtered by status='success'
  const successLogsRequest = {
    action_status: "success" as const,
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const successLogsResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: successLogsRequest,
      },
    );
  typia.assert(successLogsResponse);

  // Validate all entries have status='success'
  TestValidator.predicate("all success logs have action_status=success", () => {
    if (successLogsResponse.data.length === 0) return true;
    return successLogsResponse.data.every(
      (log) => log.action_status === "success",
    );
  });

  // Step 3: Query audit logs filtered by status='failed'
  const failedLogsRequest = {
    action_status: "failed" as const,
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const failedLogsResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: failedLogsRequest,
      },
    );
  typia.assert(failedLogsResponse);

  // Validate all entries have status='failed'
  TestValidator.predicate("all failed logs have action_status=failed", () => {
    if (failedLogsResponse.data.length === 0) return true;
    return failedLogsResponse.data.every(
      (log) => log.action_status === "failed",
    );
  });

  // Verify status_details is provided for failed entries
  if (failedLogsResponse.data.length > 0) {
    TestValidator.predicate(
      "failed logs have status_details for context",
      failedLogsResponse.data.some((log) => log.status_details !== null),
    );
  }

  // Step 4: Query audit logs filtered by status='partial'
  const partialLogsRequest = {
    action_status: "partial" as const,
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const partialLogsResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: partialLogsRequest,
      },
    );
  typia.assert(partialLogsResponse);

  // Validate all entries have status='partial'
  TestValidator.predicate("all partial logs have action_status=partial", () => {
    if (partialLogsResponse.data.length === 0) return true;
    return partialLogsResponse.data.every(
      (log) => log.action_status === "partial",
    );
  });

  // Verify status_details is provided for partial entries
  if (partialLogsResponse.data.length > 0) {
    TestValidator.predicate(
      "partial logs have status_details for context",
      partialLogsResponse.data.some((log) => log.status_details !== null),
    );
  }

  // Step 5: Query without status filter and verify pagination
  const allLogsRequest = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const allLogsResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: allLogsRequest,
      },
    );
  typia.assert(allLogsResponse);

  // Validate pagination information
  TestValidator.predicate(
    "pagination current page matches requested page",
    allLogsResponse.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit matches requested limit",
    allLogsResponse.pagination.limit === 10,
  );

  TestValidator.predicate(
    "pagination records count is valid",
    allLogsResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages count is valid",
    allLogsResponse.pagination.pages >= 0,
  );

  // Step 6: Verify each audit log entry has required fields
  if (allLogsResponse.data.length > 0) {
    const sampleLog = allLogsResponse.data[0];

    TestValidator.predicate(
      "audit log has id field",
      sampleLog.id !== null && sampleLog.id !== undefined,
    );

    TestValidator.predicate(
      "audit log has action_type field",
      sampleLog.action_type !== null && sampleLog.action_type !== undefined,
    );

    TestValidator.predicate(
      "audit log has target_type field",
      sampleLog.target_type !== null && sampleLog.target_type !== undefined,
    );

    TestValidator.predicate(
      "audit log has action_status field",
      sampleLog.action_status !== null && sampleLog.action_status !== undefined,
    );

    TestValidator.predicate(
      "audit log has moderator field",
      sampleLog.moderator !== null && sampleLog.moderator !== undefined,
    );

    TestValidator.predicate(
      "audit log has created_at field",
      sampleLog.created_at !== null && sampleLog.created_at !== undefined,
    );
  }

  // Step 7: Verify filtering by multiple criteria
  const searchRequest = {
    action_status: "success" as const,
    page: 1,
    limit: 20,
    search: "test",
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const searchResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResponse);

  // Validate filtering with search combined with status
  TestValidator.predicate(
    "search filtered logs maintain success status",
    () => {
      if (searchResponse.data.length === 0) return true;
      return searchResponse.data.every(
        (log) => log.action_status === "success",
      );
    },
  );
}
