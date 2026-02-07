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

export async function test_api_comment_mention_multiple_users_same_comment(
  connection: api.IConnection,
): Promise<void> {
  // Create primary user (comment author)
  const primaryConnection: api.IConnection = { host: connection.host };
  const primaryUser = await authorize_user_join(primaryConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(primaryUser);
  // Create first mentioned user
  const firstMentionedConnection: api.IConnection = { host: connection.host };
  const firstMentionedUser = await authorize_user_join(
    firstMentionedConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(firstMentionedUser);
  // Create second mentioned user
  const secondMentionedConnection: api.IConnection = { host: connection.host };
  const secondMentionedUser = await authorize_user_join(
    secondMentionedConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(secondMentionedUser);
  // Create article for the comment (using direct SDK since no section creation utility exists)
  const article = await api.functional.discussionBoard.user.articles.create(
    primaryConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create comment with sufficient content for multiple mentions
  const commentContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      primaryConnection,
      {
        articleId: article.id,
        body: {
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Validate comment content is long enough for position ranges
  TestValidator.predicate(
    "comment content should be long enough for mentions",
    commentContent.length >= 40,
  );
  // Create first mention at position range 5-15
  const firstMention =
    await api.functional.discussionBoard.user.articles.comments.mentions.create(
      primaryConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          discussion_board_user_id: firstMentionedUser.id,
          position_start: 5,
          position_end: 15,
        } satisfies IDiscussionBoardCommentMention.ICreate,
      },
    );
  typia.assert(firstMention);
  // Create second mention at position range 25-35
  const secondMention =
    await api.functional.discussionBoard.user.articles.comments.mentions.create(
      primaryConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          discussion_board_user_id: secondMentionedUser.id,
          position_start: 25,
          position_end: 35,
        } satisfies IDiscussionBoardCommentMention.ICreate,
      },
    );
  typia.assert(secondMention);
  // Validate that mentions are distinct and properly associated
  TestValidator.notEquals(
    "mention IDs should be different",
    firstMention.id,
    secondMention.id,
  );
  TestValidator.equals(
    "first mention should reference first user",
    firstMention.mentioned_user.id,
    firstMentionedUser.id,
  );
  TestValidator.equals(
    "second mention should reference second user",
    secondMention.mentioned_user.id,
    secondMentionedUser.id,
  );
  TestValidator.equals(
    "both mentions should reference same comment",
    firstMention.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "both mentions should reference same comment",
    secondMention.comment.id,
    comment.id,
  );
  TestValidator.notEquals(
    "position ranges should be different",
    firstMention.position_start,
    secondMention.position_start,
  );
  TestValidator.predicate(
    "first mention position_start should be less than position_end",
    firstMention.position_start < firstMention.position_end,
  );
  TestValidator.predicate(
    "second mention position_start should be less than position_end",
    secondMention.position_start < secondMention.position_end,
  );
  TestValidator.predicate(
    "position ranges should not overlap",
    firstMention.position_end <= secondMention.position_start,
  );
}
