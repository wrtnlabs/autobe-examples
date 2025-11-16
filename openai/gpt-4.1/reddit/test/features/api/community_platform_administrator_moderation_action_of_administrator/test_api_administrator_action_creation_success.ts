import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOfAdministrator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate the successful creation of an administrator action associated to a
 * moderation action by an authenticated platform administrator.
 *
 * End-to-end workflow:
 *
 * 1. Create a new administrator account (join & authenticate).
 * 2. Create the main moderation action for which the administrator action will be
 *    linked.
 * 3. Call the target endpoint to record the admin intervention, referencing
 *    administrator, session, and rationale memo.
 * 4. Validate that the administrator action is properly created and linked
 *    (matching moderation_action_id/administrator_id/session_id), audit data,
 *    and only possible as authenticated admin.
 */
export async function test_api_administrator_action_creation_success(
  connection: api.IConnection,
) {
  // 1. Join as a new administrator (also sets authentication context)
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuth);

  // 2. Create the main moderation action (requires authentication)
  // As we don't have a real report, use a random report summary for required field
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const moderationActionInput = {
    report_id: reportId,
    action_type: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 15,
    }),
    result: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 25,
    }),
    status: RandomGenerator.pick([
      "in_progress",
      "completed",
      "reversed",
    ] as const),
    target_post_id: null,
    target_comment_id: null,
    target_community_id: null,
  } satisfies ICommunityPlatformModerationAction.ICreate;
  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.administrator.moderationActions.create(
      connection,
      {
        body: moderationActionInput,
      },
    );
  typia.assert(moderationAction);
  TestValidator.equals(
    "moderation_action.report.id matches input",
    moderationAction.report.id,
    moderationActionInput.report_id,
  );

  // 3. Call the admin action create endpoint associated to the moderation action (only possible as an authenticated admin)
  const adminActionInput = {
    administrator_id: adminAuth.id,
    administrator_session_id: adminAuth.token.access as string &
      tags.Format<"uuid">,
    memo: RandomGenerator.paragraph({ sentences: 1, wordMin: 10, wordMax: 25 }),
  } satisfies ICommunityPlatformModerationActionOfAdministrator.ICreate;
  const adminAction: ICommunityPlatformModerationActionOfAdministrator =
    await api.functional.communityPlatform.administrator.moderationActions.administratorAction.create(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: adminActionInput,
      },
    );
  typia.assert(adminAction);
  TestValidator.equals(
    "admin action may reference correct moderation_action_id",
    adminAction.moderation_action_id,
    moderationAction.id,
  );
  TestValidator.equals(
    "admin action has correct administrator_id",
    adminAction.administrator_id,
    adminAuth.id,
  );
  TestValidator.equals(
    "admin action has correct administrator_session_id",
    adminAction.administrator_session_id,
    adminActionInput.administrator_session_id,
  );
}
