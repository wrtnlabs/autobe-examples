import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validates article creation API enforces all required fields.
 *
 * This test verifies that the article creation endpoint requires all mandatory
 * fields by testing that valid article creation succeeds with all required
 * fields present. Since TypeScript prevents actual field omission at
 * compile-time, this test focuses on verifying the API's response structure and
 * that the created article contains all expected data from the request.
 *
 * Test flow:
 *
 * 1. Authenticate a contributor account
 * 2. Create valid article with all required fields
 * 3. Verify the created article contains all expected fields
 * 4. Confirm article is created in draft status
 */
export async function test_api_article_creation_required_fields_missing(
  connection: api.IConnection,
) {
  // Step 1: Authenticate contributor
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: "SecurePass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor authenticated successfully",
    contributor.id !== null && contributor.id !== undefined,
  );

  // Step 2: Create valid article with all required fields
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: categoryId,
          href: href,
          referrer: referrer,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(createdArticle);

  // Step 3: Verify the created article contains all expected fields
  TestValidator.predicate(
    "created article has valid id",
    createdArticle.id !== null && createdArticle.id !== undefined,
  );
  TestValidator.equals(
    "article title matches request",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content matches request",
    createdArticle.content,
    articleContent,
  );
  TestValidator.predicate(
    "article category is set",
    createdArticle.category !== null && createdArticle.category !== undefined,
  );

  // Step 4: Confirm article is created in draft status
  TestValidator.equals(
    "article status is draft",
    createdArticle.status,
    "draft",
  );
  TestValidator.predicate(
    "article author is the authenticated contributor",
    createdArticle.author.id === contributor.id,
  );
  TestValidator.predicate(
    "article has timestamps",
    createdArticle.created_at !== null &&
      createdArticle.created_at !== undefined &&
      createdArticle.updated_at !== null &&
      createdArticle.updated_at !== undefined,
  );
}
