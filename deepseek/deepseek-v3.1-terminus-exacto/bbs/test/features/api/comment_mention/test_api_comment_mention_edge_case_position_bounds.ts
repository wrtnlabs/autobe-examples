import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentMention";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_comments_mentions_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_mentions_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_mention } from "../../../prepare/prepare_random_discussion_board_comment_mention";

export async function test_api_comment_mention_edge_case_position_bounds(
  connection: api.IConnection,
): Promise<void> {
  // Create first user (comment author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_user_join(authorConnection, {});
  typia.assert(author);
  // Create second user (to be mentioned)
  const mentionedUserConnection: api.IConnection = { host: connection.host };
  const mentionedUser = await authorize_user_join(mentionedUserConnection, {});
  typia.assert(mentionedUser);
  // Create an article using the author's connection
  // Note: We need to use an existing section or create one first
  // For now, we'll use a random section ID as the template doesn't provide section creation
  const article = await generate_random_discussion_board_user_articles_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment with controlled content length
  const commentContent = RandomGenerator.paragraph({ sentences: 1 });
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      authorConnection,
      {
        body: {
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Test mention creation at position_start = 0 and position_end = content length
  const mention1 =
    await generate_random_discussion_board_user_articles_comments_mentions_create(
      authorConnection,
      {
        body: {
          discussion_board_user_id: mentionedUser.id,
          position_start: 0,
          position_end: commentContent.length,
        } satisfies IDiscussionBoardCommentMention.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(mention1);
  // Validate the mention record contains correct position values
  TestValidator.equals(
    "position_start should be 0",
    mention1.position_start,
    0,
  );
  TestValidator.equals(
    "position_end should match comment content length",
    mention1.position_end,
    commentContent.length,
  );
  TestValidator.equals(
    "mentioned user ID should match",
    mention1.mentioned_user.id,
    mentionedUser.id,
  );
  TestValidator.equals(
    "comment ID should match",
    mention1.comment.id,
    comment.id,
  );
  // Test another boundary case: position_start > 0 and position_end < content length
  const mention2 =
    await generate_random_discussion_board_user_articles_comments_mentions_create(
      authorConnection,
      {
        body: {
          discussion_board_user_id: mentionedUser.id,
          position_start: 5,
          position_end: commentContent.length - 5,
        } satisfies IDiscussionBoardCommentMention.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(mention2);
  TestValidator.equals(
    "position_start should be 5",
    mention2.position_start,
    5,
  );
  TestValidator.equals(
    "position_end should be content length - 5",
    mention2.position_end,
    commentContent.length - 5,
  );
}
