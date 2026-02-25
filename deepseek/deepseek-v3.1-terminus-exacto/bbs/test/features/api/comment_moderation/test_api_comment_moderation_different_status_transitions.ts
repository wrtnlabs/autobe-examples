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

export async function test_api_comment_moderation_different_status_transitions(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Create admin account for moderation authority using available utility
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Create a comment that needs moderation - using random UUID since comment creation API not available
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Create moderation action with 'pending' status
  const pendingModeration =
    await api.functional.discussionBoard.admin.comments.moderations.create(
      adminConnection,
      {
        commentId,
        body: {
          action_type: "approve",
          reason: "Review pending approval",
          status: "pending",
          discussion_board_comment_id: commentId,
        },
      },
    );
  typia.assert(pendingModeration);
  TestValidator.equals("pending status", pendingModeration.status, "pending");
  TestValidator.equals("action type", pendingModeration.action_type, "approve");
  TestValidator.equals("admin matches", pendingModeration.admin.id, admin.id);
  // Test 2: Create moderation action with 'completed' status
  const completedModeration =
    await api.functional.discussionBoard.admin.comments.moderations.create(
      adminConnection,
      {
        commentId,
        body: {
          action_type: "approved",
          reason: "Comment approved after review",
          status: "completed",
          discussion_board_comment_id: commentId,
        },
      },
    );
  typia.assert(completedModeration);
  TestValidator.equals(
    "completed status",
    completedModeration.status,
    "completed",
  );
  TestValidator.equals(
    "action type",
    completedModeration.action_type,
    "approved",
  );
  // Test 3: Create moderation action with 'reversed' status
  const reversedModeration =
    await api.functional.discussionBoard.admin.comments.moderations.create(
      adminConnection,
      {
        commentId,
        body: {
          action_type: "rejected",
          reason: "Content guidelines violation",
          status: "reversed",
          discussion_board_comment_id: commentId,
        },
      },
    );
  typia.assert(reversedModeration);
  TestValidator.equals(
    "reversed status",
    reversedModeration.status,
    "reversed",
  );
  TestValidator.equals(
    "action type",
    reversedModeration.action_type,
    "rejected",
  );
  // Validate that all moderations track the same comment
  TestValidator.equals(
    "comment consistency",
    pendingModeration.comment.id,
    commentId,
  );
  TestValidator.equals(
    "comment consistency",
    completedModeration.comment.id,
    commentId,
  );
  TestValidator.equals(
    "comment consistency",
    reversedModeration.comment.id,
    commentId,
  );
  // Validate that each moderation has unique ID and timestamps
  TestValidator.notEquals(
    "unique moderation IDs",
    pendingModeration.id,
    completedModeration.id,
  );
  TestValidator.notEquals(
    "unique moderation IDs",
    pendingModeration.id,
    reversedModeration.id,
  );
  TestValidator.notEquals(
    "unique moderation IDs",
    completedModeration.id,
    reversedModeration.id,
  );
  TestValidator.predicate(
    "created at valid",
    new Date(pendingModeration.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated at valid",
    new Date(pendingModeration.updated_at).getTime() > 0,
  );
}
