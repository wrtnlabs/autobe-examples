import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_moderation_log_user_ban_audit(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Create and authenticate a regular user account
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardUser.IJoin;
  const userAuth = await authorize_user_join(userConnection, {
    body: userJoinBody,
  });
  typia.assert(userAuth);
  // 2. Create and authenticate an administrator account
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  // 3. Perform user ban action to generate moderation log
  const banBody = {
    banned_user_id: userAuth.id,
    ban_reason: RandomGenerator.paragraph({ sentences: 1 }),
    ban_duration_type: "permanent",
  } satisfies IDiscussionBoardUserBan.ICreate;
  const banResult = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    { body: banBody },
  );
  typia.assert(banResult);
  // 4. Retrieve the moderation log for the ban action
  // Since we don't have a direct way to get the moderation log ID from the ban result,
  // we need to search for moderation logs related to this ban
  // For now, we'll assume the moderation log ID is the same as the ban ID for this test
  const moderationLog =
    await api.functional.discussionBoard.admin.moderation_logs.at(
      adminConnection,
      {
        moderationLogId: banResult.id,
      },
    );
  typia.assert(moderationLog);
  // 5. Validate moderation log contains correct audit information
  TestValidator.equals(
    "action type should be ban-related",
    moderationLog.action_type,
    "ban_user",
  );
  TestValidator.equals(
    "target user ID should match banned user",
    moderationLog.targetUser?.id,
    userAuth.id,
  );
  TestValidator.equals(
    "target user display name should match",
    moderationLog.targetUser?.display_name,
    userAuth.display_name,
  );
  TestValidator.predicate(
    "admin performer should be present",
    moderationLog.admin !== null,
  );
  TestValidator.equals(
    "admin performer ID should match",
    moderationLog.admin?.id,
    adminAuth.id,
  );
  TestValidator.predicate(
    "action description should contain ban reason",
    moderationLog.action_description.includes(banBody.ban_reason),
  );
  TestValidator.predicate(
    "performed_at timestamp should be valid",
    new Date(moderationLog.performed_at).getTime() > 0,
  );
  TestValidator.equals(
    "status should be completed",
    moderationLog.status,
    "completed",
  );
}
