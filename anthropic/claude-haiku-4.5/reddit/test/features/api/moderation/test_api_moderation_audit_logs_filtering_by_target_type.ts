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

export async function test_api_moderation_audit_logs_filtering_by_target_type(
  connection: api.IConnection,
) {
  /** Step 1: Authenticate as administrator */
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  /** Step 2: Query audit logs with target_type filter for 'post' */
  const postAuditLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          target_type: "post",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(postAuditLogs);

  /** Step 3: Verify all results have target_type 'post' */
  TestValidator.predicate("all post audit logs have target_type 'post'", () =>
    postAuditLogs.data.every((log) => log.target_type === "post"),
  );

  /** Step 4: Verify action_type is consistent with target_type 'post' */
  const validPostActions = ["remove_post"];
  TestValidator.predicate(
    "post audit logs have valid action types for post",
    () =>
      postAuditLogs.data.every((log) =>
        validPostActions.includes(log.action_type),
      ),
  );

  /** Step 5: Query audit logs with target_type filter for 'comment' */
  const commentAuditLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          target_type: "comment",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(commentAuditLogs);

  /** Step 6: Verify all results have target_type 'comment' */
  TestValidator.predicate(
    "all comment audit logs have target_type 'comment'",
    () => commentAuditLogs.data.every((log) => log.target_type === "comment"),
  );

  /** Step 7: Verify action_type is consistent with target_type 'comment' */
  const validCommentActions = ["remove_comment"];
  TestValidator.predicate(
    "comment audit logs have valid action types for comment",
    () =>
      commentAuditLogs.data.every((log) =>
        validCommentActions.includes(log.action_type),
      ),
  );

  /** Step 8: Query audit logs with target_type filter for 'user' */
  const userAuditLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      connection,
      {
        body: {
          target_type: "user",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(userAuditLogs);

  /** Step 9: Verify all results have target_type 'user' */
  TestValidator.predicate("all user audit logs have target_type 'user'", () =>
    userAuditLogs.data.every((log) => log.target_type === "user"),
  );

  /** Step 10: Verify action_type is consistent with target_type 'user' */
  const validUserActions = ["issue_warning", "suspend_user", "ban_user"];
  TestValidator.predicate(
    "user audit logs have valid action types for user",
    () =>
      userAuditLogs.data.every((log) =>
        validUserActions.includes(log.action_type),
      ),
  );

  /** Step 11: Verify filtering is working by checking results are different */
  TestValidator.notEquals(
    "post and comment audit logs should be different",
    postAuditLogs.data.map((log) => log.id),
    commentAuditLogs.data.map((log) => log.id),
  );

  /** Step 12: Verify pagination information is valid */
  TestValidator.predicate(
    "pagination current page is valid",
    () => postAuditLogs.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit is positive",
    () => postAuditLogs.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records count is non-negative",
    () => postAuditLogs.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages count is non-negative",
    () => postAuditLogs.pagination.pages >= 0,
  );
}
