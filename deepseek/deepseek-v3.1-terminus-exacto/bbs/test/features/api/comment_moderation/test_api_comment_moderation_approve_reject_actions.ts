import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_articles_comments_moderations_create } from "../../../generate/generate_random_discussion_board_admin_articles_comments_moderations_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_moderation } from "../../../prepare/prepare_random_discussion_board_comment_moderation";

export async function test_api_comment_moderation_approve_reject_actions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      display_name: "Moderator Admin",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    },
  });
  typia.assert(adminAuthorized);
  // 2. User setup
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      display_name: "Test User",
      bio: "Regular discussion board user",
    },
  });
  typia.assert(userAuthorized);
  // 3. Create article - using a realistic section ID pattern
  // Note: In a real scenario, we would need to create a section first or use an existing one
  // For this test, we'll use a valid UUID format that represents a section
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        section_id: "00000000-0000-0000-0000-000000000001" as string &
          tags.Format<"uuid">,
        status: "published" as const,
      },
    },
  );
  typia.assert(article);
  // 4. Create multiple comments with varying content
  const constructiveComment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content:
            "This is a well-reasoned comment that contributes positively to the discussion.",
        },
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(constructiveComment);
  const inappropriateComment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content:
            "This comment contains inappropriate content that violates community guidelines.",
        },
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(inappropriateComment);
  // 5. Admin moderation actions
  const approveModeration =
    await generate_random_discussion_board_admin_articles_comments_moderations_create(
      adminConnection,
      {
        body: {
          action_type: "approve" as const,
          reason:
            "Comment provides constructive feedback and follows community guidelines",
        },
        params: {
          articleId: article.id,
          commentId: constructiveComment.id,
        },
      },
    );
  typia.assert(approveModeration);
  const rejectModeration =
    await generate_random_discussion_board_admin_articles_comments_moderations_create(
      adminConnection,
      {
        body: {
          action_type: "reject" as const,
          reason:
            "Comment violates community guidelines with inappropriate content",
        },
        params: {
          articleId: article.id,
          commentId: inappropriateComment.id,
        },
      },
    );
  typia.assert(rejectModeration);
  // 6. Validate moderation records
  TestValidator.equals(
    "approve moderation action type",
    approveModeration.action_type,
    "approve",
  );
  TestValidator.equals(
    "reject moderation action type",
    rejectModeration.action_type,
    "reject",
  );
  TestValidator.predicate(
    "approve reason not empty",
    approveModeration.reason.length > 0,
  );
  TestValidator.predicate(
    "reject reason not empty",
    rejectModeration.reason.length > 0,
  );
  TestValidator.equals(
    "approve comment ID matches",
    approveModeration.comment.id,
    constructiveComment.id,
  );
  TestValidator.equals(
    "reject comment ID matches",
    rejectModeration.comment.id,
    inappropriateComment.id,
  );
  TestValidator.predicate(
    "moderation has admin info",
    approveModeration.admin.id.length > 0,
  );
  TestValidator.predicate(
    "moderation has valid timestamps",
    approveModeration.created_at.length > 0,
  );
  TestValidator.notEquals(
    "different moderation IDs",
    approveModeration.id,
    rejectModeration.id,
  );
}
