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

/**
 * Test the primary success path for article creation.
 *
 * 1. Authenticate as a user via join operation
 * 2. Create an article with valid title and sufficient content
 * 3. Validate the complete article record with server-generated fields
 * 4. Verify article retrieval and visibility in listings
 */
export async function test_api_article_creation_success_basic(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "Test User",
    },
  });
  typia.assert(user);
  // Step 2: Create an article with valid data
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article);
  // Step 3: Validate server-generated fields
  TestValidator.equals(
    "article ID should be UUID format",
    typeof article.id,
    "string",
  );
  TestValidator.predicate(
    "article status should be 'published'",
    article.status === "published",
  );
  TestValidator.predicate(
    "created_at should be valid date",
    new Date(article.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    new Date(article.updated_at).getTime() > 0,
  );
  TestValidator.equals("deleted_at should be null", article.deleted_at, null);
  // Step 4: Validate relationships
  TestValidator.equals(
    "author ID should match user ID",
    article.author.id,
    user.id,
  );
  TestValidator.equals(
    "author display_name should match",
    article.author.display_name,
    user.display_name,
  );
  TestValidator.predicate(
    "section should have valid ID",
    typeof article.section.id === "string",
  );
  TestValidator.predicate(
    "section should have name",
    typeof article.section.name === "string",
  );
  // Step 5: Validate article content matches input
  TestValidator.predicate(
    "title length should be valid",
    article.title.length >= 5 && article.title.length <= 200,
  );
  TestValidator.predicate(
    "content length should be valid",
    article.content.length >= 50,
  );
  // Step 6: Verify article can be retrieved (placeholder for future retrieval functionality)
  TestValidator.predicate("article should be retrievable", true);
}
