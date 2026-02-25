import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_comments_moderations_create } from "../../../generate/generate_random_discussion_board_admin_comments_moderations_create";
import { prepare_random_discussion_board_comment_moderation } from "../../../prepare/prepare_random_discussion_board_comment_moderation";

/**
 * Test successful comment moderation with standard action type.
 *
 * Setup: Create admin account through join process. Create a comment scenario
 * using modular approach. Execute moderation action with valid action type and reason.
 * Validate: Response should include complete moderation record with ID, action type,
 * reason, status, timestamps, and proper references to comment and admin.
 */
export async function test_api_comment_moderation_standard_action(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Create a comment scenario for moderation
  // Note: Since we don't have user/article/comment creation APIs provided,
  // we'll use a modular approach with the available comment moderation API
  // In a real implementation, we would create: user → article → comment
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Define standard action types for testing
  const standardActions = ["edit", "delete", "approve", "reject"] as const;
  const actionType = RandomGenerator.pick(standardActions);
  // 4. Perform moderation action with standard action type
  const moderation =
    await api.functional.discussionBoard.admin.comments.moderations.create(
      adminConnection,
      {
        commentId,
        body: {
          action_type: actionType,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "completed",
          discussion_board_comment_id: commentId,
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(moderation);
  // 5. Validate moderation record structure
  TestValidator.predicate(
    "moderation has valid ID",
    () =>
      typeof moderation.id === "string" &&
      /^[0-9a-f-]{36}$/i.test(moderation.id),
  );
  TestValidator.equals(
    "action type matches input",
    moderation.action_type,
    actionType,
  );
  TestValidator.predicate(
    "reason is not empty",
    () => moderation.reason.length > 0,
  );
  TestValidator.predicate(
    "status is valid",
    () => typeof moderation.status === "string" && moderation.status.length > 0,
  );
  TestValidator.predicate(
    "has creation timestamp",
    () =>
      typeof moderation.created_at === "string" &&
      moderation.created_at.length > 0,
  );
  TestValidator.predicate(
    "has update timestamp",
    () =>
      typeof moderation.updated_at === "string" &&
      moderation.updated_at.length > 0,
  );
  // 6. Validate comment reference
  TestValidator.equals("comment ID matches", moderation.comment.id, commentId);
  TestValidator.predicate(
    "comment has content",
    () => typeof moderation.comment.content === "string",
  );
  TestValidator.predicate(
    "comment has author",
    () =>
      typeof moderation.comment.author.id === "string" &&
      moderation.comment.author.display_name.length > 0,
  );
  // 7. Validate admin attribution
  TestValidator.equals(
    "admin ID matches moderator",
    moderation.admin.id,
    admin.id,
  );
  TestValidator.equals(
    "admin email matches",
    moderation.admin.email,
    admin.email,
  );
  TestValidator.equals(
    "admin display name matches",
    moderation.admin.display_name,
    admin.display_name,
  );
  TestValidator.predicate(
    "admin has creation timestamp",
    () =>
      typeof moderation.admin.created_at === "string" &&
      moderation.admin.created_at.length > 0,
  );
}
