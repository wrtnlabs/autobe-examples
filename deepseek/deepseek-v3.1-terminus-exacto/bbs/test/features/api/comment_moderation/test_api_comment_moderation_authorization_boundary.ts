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

export async function test_api_comment_moderation_authorization_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and successful moderation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a valid comment ID
  const validCommentId = typia.random<string & tags.Format<"uuid">>();
  // Create moderation action successfully
  const moderation =
    await api.functional.discussionBoard.admin.comments.moderations.create(
      adminConnection,
      {
        commentId: validCommentId,
        body: {
          action_type: "delete",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "completed",
          discussion_board_comment_id: validCommentId,
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(moderation);
  TestValidator.equals(
    "moderation admin matches",
    moderation.admin.id,
    admin.id,
  );
  TestValidator.equals(
    "moderation comment ID matches",
    moderation.comment.id,
    validCommentId,
  );
  // 2. Test authorization boundary - regular user should not be able to moderate
  // Create a separate connection without admin authentication
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated user cannot moderate comments",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.admin.comments.moderations.create(
        unauthenticatedConnection,
        {
          commentId: validCommentId,
          body: {
            action_type: "delete",
            reason: RandomGenerator.paragraph({ sentences: 2 }),
            status: "pending",
            discussion_board_comment_id: validCommentId,
          } satisfies IDiscussionBoardCommentModeration.ICreate,
        },
      );
    },
  );
  // 3. Test proper business logic - attempt moderation with valid but non-existent comment
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent comment should be rejected",
    [404],
    async () => {
      await api.functional.discussionBoard.admin.comments.moderations.create(
        adminConnection,
        {
          commentId: nonExistentCommentId,
          body: {
            action_type: "approve",
            reason: RandomGenerator.paragraph({ sentences: 1 }),
            status: "pending",
            discussion_board_comment_id: nonExistentCommentId,
          } satisfies IDiscussionBoardCommentModeration.ICreate,
        },
      );
    },
  );
}
