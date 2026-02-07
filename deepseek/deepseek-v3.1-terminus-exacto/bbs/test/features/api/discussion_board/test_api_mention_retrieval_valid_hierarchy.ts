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

export async function test_api_mention_retrieval_valid_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register a user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create an article with valid section ID (using a random UUID that should exist)
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
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Create a mention within the comment with valid position range
  const positionStart = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const positionEnd =
    positionStart +
    typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
  const mention =
    await generate_random_discussion_board_user_articles_comments_mentions_create(
      userConnection,
      {
        body: {
          discussion_board_user_id: user.id,
          position_start: positionStart,
          position_end: positionEnd,
        } satisfies IDiscussionBoardCommentMention.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(mention);
  // Retrieve the mention using the GET endpoint
  const retrievedMention =
    await api.functional.discussionBoard.articles.comments.mentions.at(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        mentionId: mention.id,
      },
    );
  typia.assert(retrievedMention);
  // Validate the mention hierarchy and details
  TestValidator.equals("mention ID matches", retrievedMention.id, mention.id);
  TestValidator.equals(
    "position start matches",
    retrievedMention.position_start,
    mention.position_start,
  );
  TestValidator.equals(
    "position end matches",
    retrievedMention.position_end,
    mention.position_end,
  );
  TestValidator.equals(
    "comment ID matches",
    retrievedMention.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "mentioned user ID matches",
    retrievedMention.mentioned_user.id,
    user.id,
  );
  TestValidator.predicate(
    "created at timestamp is valid",
    retrievedMention.created_at.length > 0,
  );
}
