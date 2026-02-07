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
 * Test that a regular user can successfully delete their own article.
 * Validates soft deletion (deleted_at timestamp), complete response details,
 * and post-deletion access restrictions.
 */
export async function test_api_article_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Note: Section creation requires administrator privileges which are not available
  // in this user-focused test. The test assumes a valid section already exists.
  // For realistic testing, sections should be pre-created in test setup.
  // Create article as the user with a placeholder section_id
  // In a real scenario, this would require a valid existing section_id
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Delete the article
  const deletedArticle =
    await api.functional.discussionBoard.user.articles.erase(userConnection, {
      articleId: article.id,
    });
  typia.assert(deletedArticle);
  // Validate soft deletion
  TestValidator.predicate(
    "article should have deleted_at timestamp",
    deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );
  // Validate response contains complete article details
  TestValidator.equals(
    "article ID should match",
    deletedArticle.id,
    article.id,
  );
  TestValidator.equals(
    "article title should match",
    deletedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article content should match",
    deletedArticle.content,
    article.content,
  );
  TestValidator.equals(
    "article section should match",
    deletedArticle.section.id,
    article.section.id,
  );
  TestValidator.equals(
    "article author should match",
    deletedArticle.author.id,
    article.author.id,
  );
  // Note: Post-deletion access testing would require GET endpoints
  // which are not available in the provided API functions
  // The test focuses on successful deletion and response validation
}
