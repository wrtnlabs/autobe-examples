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
 * Test filtering moderation audit logs by target resource type.
 *
 * Validates that the audit log API correctly filters moderation actions by the
 * type of resource being acted upon. This test creates a moderator account and
 * queries the moderation audit logs with various target_type filters to
 * ensure:
 *
 * 1. Filtering by target_type='post' returns only post-related moderation actions
 * 2. Filtering by target_type='comment' returns only comment-related actions
 * 3. Filtering by target_type='user' returns only user-discipline actions
 * 4. Combined filters work correctly with action_type and status parameters
 * 5. Each returned audit log entry has the correct target_type matching the filter
 *
 * This test ensures moderators can effectively analyze and monitor moderation
 * patterns categorized by content type versus user discipline actions.
 */
export async function test_api_moderation_audit_logs_filter_by_target_type(
  connection: api.IConnection,
) {
  // 1. Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Query audit logs filtered by target_type='post'
  const postFilterLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          target_type: "post",
          limit: 20,
          page: 1,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(postFilterLogs);

  // Validate that all returned logs have target_type='post'
  if (postFilterLogs.data.length > 0) {
    postFilterLogs.data.forEach((log) => {
      TestValidator.equals(
        "post filter returns only post target types",
        log.target_type,
        "post",
      );
    });
  }

  // 3. Query audit logs filtered by target_type='comment'
  const commentFilterLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          target_type: "comment",
          limit: 20,
          page: 1,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(commentFilterLogs);

  // Validate that all returned logs have target_type='comment'
  if (commentFilterLogs.data.length > 0) {
    commentFilterLogs.data.forEach((log) => {
      TestValidator.equals(
        "comment filter returns only comment target types",
        log.target_type,
        "comment",
      );
    });
  }

  // 4. Query audit logs filtered by target_type='user'
  const userFilterLogs =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          target_type: "user",
          limit: 20,
          page: 1,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(userFilterLogs);

  // Validate that all returned logs have target_type='user'
  if (userFilterLogs.data.length > 0) {
    userFilterLogs.data.forEach((log) => {
      TestValidator.equals(
        "user filter returns only user target types",
        log.target_type,
        "user",
      );
    });
  }

  // 5. Test combined filters: target_type='user' with action_type='suspend_user'
  const combinedUserSuspend =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          target_type: "user",
          action_type: "suspend_user",
          limit: 20,
          page: 1,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(combinedUserSuspend);

  // Validate combined filter results
  if (combinedUserSuspend.data.length > 0) {
    combinedUserSuspend.data.forEach((log) => {
      TestValidator.equals(
        "combined user filter has target_type user",
        log.target_type,
        "user",
      );
      TestValidator.equals(
        "combined user filter has action_type suspend_user",
        log.action_type,
        "suspend_user",
      );
    });
  }

  // 6. Test combined filters: target_type='post' with action_type='remove_post'
  const combinedPostRemove =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          target_type: "post",
          action_type: "remove_post",
          limit: 20,
          page: 1,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(combinedPostRemove);

  // Validate combined filter results
  if (combinedPostRemove.data.length > 0) {
    combinedPostRemove.data.forEach((log) => {
      TestValidator.equals(
        "combined post filter has target_type post",
        log.target_type,
        "post",
      );
      TestValidator.equals(
        "combined post filter has action_type remove_post",
        log.action_type,
        "remove_post",
      );
    });
  }

  // 7. Test combined filters: target_type='comment' with action_type='remove_comment'
  const combinedCommentRemove =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          target_type: "comment",
          action_type: "remove_comment",
          limit: 20,
          page: 1,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(combinedCommentRemove);

  // Validate combined filter results
  if (combinedCommentRemove.data.length > 0) {
    combinedCommentRemove.data.forEach((log) => {
      TestValidator.equals(
        "combined comment filter has target_type comment",
        log.target_type,
        "comment",
      );
      TestValidator.equals(
        "combined comment filter has action_type remove_comment",
        log.action_type,
        "remove_comment",
      );
    });
  }

  // 8. Verify pagination info is consistent
  TestValidator.predicate(
    "post filter pagination current page is at least 1",
    postFilterLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "post filter pagination limit is positive",
    postFilterLogs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "comment filter pagination records count is non-negative",
    commentFilterLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "user filter pagination pages count is non-negative",
    userFilterLogs.pagination.pages >= 0,
  );
}
