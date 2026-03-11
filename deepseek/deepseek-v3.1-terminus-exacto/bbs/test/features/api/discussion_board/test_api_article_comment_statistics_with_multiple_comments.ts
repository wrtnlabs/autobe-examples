import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMvArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvArticleComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test retrieving comment statistics for an article with multiple comments.
 * Validates that the materialized view correctly aggregates comment counts
 * and timestamps when multiple comments are added to an article.
 */
export async function test_api_article_comment_statistics_with_multiple_comments(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and register account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // Create an article for commenting
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create first comment
  const firstComment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: { articleId: article.id },
      },
    );
  typia.assert(firstComment);
  // Create second comment
  const secondComment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: { articleId: article.id },
      },
    );
  typia.assert(secondComment);
  // Create a new connection for statistics retrieval (following connection isolation pattern)
  const statsConnection: api.IConnection = { host: connection.host };
  // Retrieve comment statistics
  const statistics =
    await api.functional.discussionBoard.articles.comment_statistics.at(
      statsConnection,
      { articleId: article.id },
    );
  typia.assert(statistics);
  // Validate statistics
  TestValidator.equals(
    "total comment count should be 2",
    statistics.totalCommentCount,
    2,
  );
  TestValidator.predicate(
    "latest comment timestamp should be set",
    statistics.latestCommentTimestamp !== null,
  );
  // Validate that latest comment timestamp corresponds to the most recent comment
  if (statistics.latestCommentTimestamp !== null) {
    const latestTimestamp = new Date(statistics.latestCommentTimestamp);
    const secondCommentTimestamp = new Date(secondComment.created_at);
    // Allow for small timing differences due to database processing
    TestValidator.predicate(
      "latest comment timestamp should be close to second comment timestamp",
      Math.abs(latestTimestamp.getTime() - secondCommentTimestamp.getTime()) <
        5000,
    );
  }
  TestValidator.predicate(
    "refresh timestamp should be reasonable",
    new Date(statistics.refreshTimestamp) <= new Date(),
  );
  TestValidator.equals(
    "article ID should match",
    statistics.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title should match",
    statistics.article.title,
    article.title,
  );
  TestValidator.equals(
    "article author ID should match",
    statistics.article.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "article author display name should match",
    statistics.article.author.display_name,
    article.author.display_name,
  );
}
