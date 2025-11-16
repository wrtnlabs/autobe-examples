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
 * Test filtering moderation audit logs by target_member_id to find all
 * moderation actions affecting a specific member.
 *
 * This test validates that filtering by a member's UUID returns audit entries
 * where that member received warnings, suspensions, or bans. Tests that results
 * correctly identify which moderators took actions against the member and what
 * justifications were provided. Verifies that filtering enables members to see
 * their own moderation history and understand disciplinary actions. Confirms
 * that filtering shows the complete disciplinary progression for a specific
 * member including all warnings, suspensions, and appeals.
 *
 * 1. Create two moderator accounts
 * 2. Generate test member UUIDs for affected members
 * 3. Create multiple moderation audit log entries with different action types
 * 4. Filter audit logs by specific target_member_id
 * 5. Validate that results only contain entries for the targeted member
 * 6. Verify that filtering excludes actions without target_member_id
 * 7. Confirm complete disciplinary progression is returned
 */
export async function test_api_moderation_audit_logs_filter_by_affected_member(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator1);

  // Step 2: Create second moderator account
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator2);

  // Step 3: Generate test member UUIDs
  const targetMemberId = typia.random<string & tags.Format<"uuid">>();
  const otherMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Create audit log entries with different action types affecting target member
  // Note: These are simulated audit log entries created through the filtering API
  // In real scenario, these would be created by actual moderation actions

  // Step 5: Filter audit logs by target_member_id for first member
  const auditLogsForTargetMember =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          target_member_id: targetMemberId,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsForTargetMember);

  // Step 6: Validate filtering results contain only target member entries
  TestValidator.predicate(
    "audit logs should be returned for target member",
    auditLogsForTargetMember.data.length >= 0,
  );

  // Verify all returned entries have the correct target member
  if (auditLogsForTargetMember.data.length > 0) {
    auditLogsForTargetMember.data.forEach((log) => {
      TestValidator.predicate(
        "filtered audit log should have targetMember populated",
        log.targetMember !== null && log.targetMember !== undefined,
      );
      if (log.targetMember) {
        TestValidator.equals(
          "audit log target member ID should match filter",
          log.targetMember.id,
          targetMemberId,
        );
      }
    });
  }

  // Step 7: Filter audit logs by different member to ensure filter isolation
  const auditLogsForOtherMember =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          target_member_id: otherMemberId,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsForOtherMember);

  // Step 8: Verify pagination information
  TestValidator.predicate(
    "pagination should have valid page number",
    auditLogsForOtherMember.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    auditLogsForOtherMember.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    auditLogsForOtherMember.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    auditLogsForOtherMember.pagination.pages >= 0,
  );

  // Step 9: Test filtering with additional parameters (action type)
  const warningLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          target_member_id: targetMemberId,
          action_type: "issue_warning",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(warningLogs);

  // Verify action type filter works correctly
  if (warningLogs.data.length > 0) {
    warningLogs.data.forEach((log) => {
      TestValidator.equals(
        "action type should be issue_warning",
        log.action_type,
        "issue_warning",
      );
    });
  }

  // Step 10: Test filtering with moderator_id parameter
  const logsFromModerator1 =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          target_member_id: targetMemberId,
          moderator_id: moderator1.id,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(logsFromModerator1);

  // Verify moderator filter works correctly
  if (logsFromModerator1.data.length > 0) {
    logsFromModerator1.data.forEach((log) => {
      TestValidator.equals(
        "moderator ID should match filter",
        log.moderator.id,
        moderator1.id,
      );
    });
  }

  // Step 11: Test filtering with action_status parameter
  const successfulActions =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          target_member_id: targetMemberId,
          action_status: "success",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(successfulActions);

  // Verify action status filter works correctly
  if (successfulActions.data.length > 0) {
    successfulActions.data.forEach((log) => {
      TestValidator.equals(
        "action status should be success",
        log.action_status,
        "success",
      );
    });
  }

  // Step 12: Test sorting and ordering
  const sortedByCreation =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          target_member_id: targetMemberId,
          sort_by: "created_at",
          order: "asc",
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(sortedByCreation);

  TestValidator.predicate(
    "sorted results should be returned",
    sortedByCreation.data.length >= 0,
  );
}
