import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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

export async function test_api_article_tags_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
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
  typia.assert(authorizedMember);
  // Create an article for tag operations
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
  // Test 1: Add initial tags with duplicates and normalization cases
  const initialTags = [
    "technology",
    "programming",
    "TECHNOLOGY", // duplicate with different case
    "  programming  ", // duplicate with whitespace
    "web development",
  ];
  const updatedArticle1 =
    await api.functional.discussionBoard.articles.tags.update(
      memberConnection,
      {
        articleId: article.id,
        body: {
          tags: initialTags,
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  typia.assert(updatedArticle1);
  // Validate that the article update was successful
  TestValidator.equals(
    "article ID remains the same",
    updatedArticle1.id,
    article.id,
  );
  TestValidator.equals(
    "article title remains unchanged",
    updatedArticle1.title,
    article.title,
  );
  // Test 2: Update tags with completely new set
  const newTags = ["artificial intelligence", "machine learning", "AI"];
  const updatedArticle2 =
    await api.functional.discussionBoard.articles.tags.update(
      memberConnection,
      {
        articleId: article.id,
        body: {
          tags: newTags,
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  typia.assert(updatedArticle2);
  // Validate article integrity after second update
  TestValidator.equals(
    "article ID remains consistent",
    updatedArticle2.id,
    article.id,
  );
  TestValidator.equals(
    "article content remains unchanged",
    updatedArticle2.body,
    article.body,
  );
  // Test 3: Update with empty tags array (should be rejected by schema validation)
  await TestValidator.error("empty tags array should be rejected", async () => {
    await api.functional.discussionBoard.articles.tags.update(
      memberConnection,
      {
        articleId: article.id,
        body: {
          tags: [],
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  });
}
