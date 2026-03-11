import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_comment_statistics_without_comments(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and register a member
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
  // Create an article without any comments
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
  // Retrieve comment statistics for the article using member connection
  const statistics =
    await api.functional.discussionBoard.articles.comment_statistics.at(
      memberConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(statistics);
  // Validate statistics for zero comments
  TestValidator.equals(
    "total comment count should be 0",
    statistics.totalCommentCount,
    0,
  );
  TestValidator.equals(
    "latest comment timestamp should be null",
    statistics.latestCommentTimestamp,
    null,
  );
  // Validate article summary structure
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
  TestValidator.predicate(
    "refresh timestamp should be valid date",
    () => new Date(statistics.refreshTimestamp).toString() !== "Invalid Date",
  );
  // Validate author information (basic structure check)
  TestValidator.predicate(
    "author should have ID",
    statistics.article.author.id.length > 0,
  );
  TestValidator.predicate(
    "author should have display name",
    statistics.article.author.display_name.length > 0,
  );
  // Validate section information (basic structure check)
  TestValidator.predicate(
    "section should have ID",
    statistics.article.section.id.length > 0,
  );
  TestValidator.predicate(
    "section should have name",
    statistics.article.section.name.length > 0,
  );
  // Validate tags array exists (even if empty)
  TestValidator.predicate(
    "tags should be an array",
    Array.isArray(statistics.article.tags),
  );
}
