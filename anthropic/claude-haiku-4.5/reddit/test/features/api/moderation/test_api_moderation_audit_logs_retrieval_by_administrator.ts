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
 * Test successful retrieval of moderation audit logs by authenticated
 * administrator.
 *
 * This scenario validates the complete audit log querying workflow with proper
 * pagination and filtering support. The test ensures administrators can
 * retrieve historical moderation actions from the immutable audit trail with
 * full accountability tracking.
 *
 * Test workflow:
 *
 * 1. Create administrator account to establish authentication context
 * 2. Query moderation audit logs with pagination parameters
 * 3. Validate paginated response structure and metadata
 * 4. Verify audit log entries contain all required fields
 * 5. Validate timestamp and status information correctness
 */
export async function test_api_moderation_audit_logs_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account to establish authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Query moderation audit logs with pagination parameters
  const requestBody = {
    page: 1,
    limit: 20,
    search: undefined,
    action_type: undefined,
    target_type: undefined,
    target_member_id: undefined,
    moderator_id: undefined,
    action_status: undefined,
    created_at_from: undefined,
    created_at_to: undefined,
    sort_by: "created_at",
    order: "desc",
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const auditLogsResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(auditLogsResponse);

  // Step 3: Validate paginated response structure and metadata
  TestValidator.predicate(
    "pagination metadata should exist",
    auditLogsResponse.pagination !== null &&
      auditLogsResponse.pagination !== undefined,
  );

  const pagination = auditLogsResponse.pagination;
  TestValidator.equals("current page should be 1", pagination.current, 1);
  TestValidator.equals("limit should be 20", pagination.limit, 20);
  TestValidator.predicate(
    "total records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    pagination.pages >= 0,
  );

  // Step 4: Verify audit log entries contain all required fields
  TestValidator.predicate(
    "audit logs data array should exist",
    Array.isArray(auditLogsResponse.data),
  );

  if (auditLogsResponse.data.length > 0) {
    const firstAuditLog = auditLogsResponse.data[0];

    // Validate required fields exist and have correct types
    TestValidator.predicate(
      "audit log id should be valid UUID",
      typeof firstAuditLog.id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          firstAuditLog.id,
        ),
    );

    TestValidator.predicate(
      "action_type should be valid action type",
      [
        "remove_post",
        "remove_comment",
        "issue_warning",
        "suspend_user",
        "ban_user",
        "approve_report",
        "deny_report",
        "overturn_decision",
        "reduce_punishment",
      ].includes(firstAuditLog.action_type),
    );

    TestValidator.predicate(
      "target_type should be valid type",
      ["post", "comment", "user"].includes(firstAuditLog.target_type),
    );

    TestValidator.predicate(
      "target_id should exist",
      typeof firstAuditLog.target_id === "string" &&
        firstAuditLog.target_id.length > 0,
    );

    TestValidator.predicate(
      "action_reason should be descriptive",
      typeof firstAuditLog.action_reason === "string" &&
        firstAuditLog.action_reason.length > 0,
    );

    TestValidator.predicate(
      "action_status should be valid status",
      ["success", "failed", "partial"].includes(firstAuditLog.action_status),
    );

    TestValidator.predicate(
      "moderator information should exist",
      firstAuditLog.moderator !== null &&
        firstAuditLog.moderator !== undefined &&
        typeof firstAuditLog.moderator.id === "string" &&
        typeof firstAuditLog.moderator.username === "string",
    );

    TestValidator.predicate(
      "created_at should be ISO 8601 timestamp",
      typeof firstAuditLog.created_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstAuditLog.created_at),
    );
  }

  // Step 5: Test with specific filters
  const filteredRequest = {
    page: 1,
    limit: 10,
    action_type: "remove_post" as const,
    action_status: "success" as const,
    sort_by: "created_at" as const,
    order: "asc" as const,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const filteredResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: filteredRequest,
      },
    );
  typia.assert(filteredResponse);

  TestValidator.predicate(
    "filtered response should contain valid pagination",
    filteredResponse.pagination.current === 1 &&
      filteredResponse.pagination.limit === 10,
  );

  // Verify filtering worked - if there are results, they should match filters
  if (filteredResponse.data.length > 0) {
    filteredResponse.data.forEach((log) => {
      TestValidator.equals(
        "action_type should match filter",
        log.action_type,
        "remove_post",
      );
      TestValidator.equals(
        "action_status should match filter",
        log.action_status,
        "success",
      );
    });
  }

  TestValidator.predicate(
    "audit logs retrieval test completed successfully",
    true,
  );
}
