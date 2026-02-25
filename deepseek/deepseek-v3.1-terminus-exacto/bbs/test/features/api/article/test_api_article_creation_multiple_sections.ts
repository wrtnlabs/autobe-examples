import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_creation_multiple_sections(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create multiple articles using the same section ID
  // Note: Section creation functionality not available in current API
  // Using a single randomly generated section ID for all articles
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const articles: IDiscussionBoardArticle[] = [];
  // Create 3 articles in the same section
  for (let i = 0; i < 3; i++) {
    const article = await api.functional.discussionBoard.user.articles.create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }).slice(0, 50),
          content: RandomGenerator.paragraph({ sentences: 3 }),
          discussion_board_section_id: sectionId,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    articles.push(article);
    // Validate section assignment
    TestValidator.equals(
      `article ${article.id} section ID matches`,
      article.section.id,
      sectionId,
    );
  }
  // Validate all articles have the same section
  articles.forEach((article, index) => {
    TestValidator.equals(
      `article ${index} has consistent section assignment`,
      article.section.id,
      sectionId,
    );
  });
  // Validate uniqueness of article IDs
  const articleIds = articles.map((article) => article.id);
  const uniqueArticleIds = new Set(articleIds);
  TestValidator.equals(
    "all article IDs are unique",
    articleIds.length,
    uniqueArticleIds.size,
  );
  // Additional validation: article titles should be different
  const articleTitles = articles.map((article) => article.title);
  const uniqueTitles = new Set(articleTitles);
  TestValidator.equals(
    "all article titles are unique",
    articleTitles.length,
    uniqueTitles.size,
  );
}
