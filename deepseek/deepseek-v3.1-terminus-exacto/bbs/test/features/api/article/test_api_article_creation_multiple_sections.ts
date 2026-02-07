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
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  // Create multiple valid section IDs (using typia.random for proper UUID format)
  const sectionIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // Create articles in each section
  const articles: IDiscussionBoardArticle[] = [];
  for (const sectionId of sectionIds) {
    const article = await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 3,
            sentenceMax: 6,
          }),
          section_id: sectionId,
          status: RandomGenerator.pick([
            "draft",
            "published",
            "archived",
          ] as const),
        },
      },
    );
    typia.assert(article);
    articles.push(article);
    // Verify section assignment
    TestValidator.equals(
      `article ${article.id} section assignment`,
      article.section.id,
      sectionId,
    );
  }
  // Verify all articles have unique IDs
  const articleIds = articles.map((article) => article.id);
  const uniqueIds = new Set(articleIds);
  TestValidator.equals(
    "all articles have unique IDs",
    articleIds.length,
    uniqueIds.size,
  );
  // Test business logic error: duplicate article creation with same title/content in same section
  // This tests business validation, not type validation
  const existingSectionId = sectionIds[0]!;
  const existingArticle = articles[0]!;
  await TestValidator.error(
    "reject duplicate article creation in same section",
    async () => {
      await generate_random_discussion_board_user_articles_create(
        userConnection,
        {
          body: {
            title: existingArticle.title,
            content: existingArticle.content,
            section_id: existingSectionId,
            status: "published",
          },
        },
      );
    },
  );
}
