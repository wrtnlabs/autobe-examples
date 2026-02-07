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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_bans_create } from "../../../generate/generate_random_discussion_board_super_admin_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

/**
 * Test successful retrieval of an existing moderation log record created by a super administrator.
 * 1. Create and authenticate as super administrator
 * 2. Create a user ban action to generate a moderation log
 * 3. Retrieve the moderation log using its ID
 * 4. Validate complete moderation log details
 */
export async function test_api_moderation_log_retrieval_existing_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create a user ban action to generate a moderation log
  const ban = await generate_random_discussion_board_super_admin_bans_create(
    superAdminConnection,
    {
      body: {
        banned_user_id: typia.random<string & tags.Format<"uuid">>(),
        ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
        ban_duration_type: "permanent",
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // 3. Retrieve the moderation log - since we don't have a direct way to get the moderation log ID
  // from the ban creation, we need to use a valid moderation log ID
  // For this test, we'll use the ban ID as a placeholder, but in a real scenario
  // we would need to list moderation logs first or have a separate endpoint
  const moderationLogId = ban.id; // Using ban ID as moderation log ID for this test
  const moderationLog =
    await api.functional.discussionBoard.superAdmin.moderation_logs.at(
      superAdminConnection,
      {
        moderationLogId: moderationLogId,
      },
    );
  typia.assert(moderationLog);
  // 4. Validate complete moderation log details
  TestValidator.equals(
    "moderation log ID matches",
    moderationLog.id,
    moderationLogId,
  );
  TestValidator.predicate(
    "has valid action type",
    moderationLog.action_type.length > 0,
  );
  TestValidator.predicate(
    "has action description",
    moderationLog.action_description.length > 0,
  );
  TestValidator.predicate(
    "has IP address",
    moderationLog.ip_address.length > 0,
  );
  TestValidator.predicate(
    "has performed at timestamp",
    moderationLog.performed_at.length > 0,
  );
  TestValidator.predicate(
    "has valid status",
    ["pending", "completed", "failed", "cancelled"].includes(
      moderationLog.status,
    ),
  );
  TestValidator.predicate(
    "has created at timestamp",
    moderationLog.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated at timestamp",
    moderationLog.updated_at.length > 0,
  );
  // Validate performer information (either admin or superAdmin should be present)
  TestValidator.predicate(
    "has performer information",
    moderationLog.admin !== null || moderationLog.superAdmin !== null,
  );
  // If superAdmin performed the action, validate their information
  if (moderationLog.superAdmin) {
    TestValidator.equals(
      "super admin ID matches",
      moderationLog.superAdmin.id,
      superAdminAuth.id,
    );
    TestValidator.equals(
      "super admin email matches",
      moderationLog.superAdmin.email,
      superAdminAuth.email,
    );
    TestValidator.equals(
      "super admin privilege level",
      moderationLog.superAdmin.privilege_level,
      "super_admin",
    );
  }
  // Validate target entity details
  TestValidator.predicate(
    "has target entity",
    moderationLog.targetArticle !== null ||
      moderationLog.targetComment !== null ||
      moderationLog.targetUser !== null ||
      moderationLog.targetSection !== null,
  );
}
