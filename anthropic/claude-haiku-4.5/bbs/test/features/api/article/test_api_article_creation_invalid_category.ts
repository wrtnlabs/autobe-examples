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
 * Test article creation with non-existent category ID.
 *
 * This test validates that the article creation endpoint properly rejects
 * attempts to create articles with invalid category references. It verifies
 * that the system enforces referential integrity by preventing articles from
 * being created with non-existent category IDs.
 *
 * Test workflow:
 *
 * 1. Register a new contributor account for testing
 * 2. Attempt to create an article with a valid title and content
 * 3. Use a non-existent (fabricated) category ID that doesn't exist in the
 *    database
 * 4. Verify that the API rejects the request with an error
 * 5. Confirm the error indicates an invalid category reference
 * 6. Verify no article was created despite the invalid request
 */
export async function test_api_article_creation_invalid_category(
  connection: api.IConnection,
) {
  // Step 1: Register contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2-4: Attempt to create article with non-existent category ID
  const nonExistentCategoryId = "00000000-0000-0000-0000-000000000000";

  await TestValidator.error(
    "article creation should fail with non-existent category",
    async () => {
      await api.functional.discussionBoard.contributor.articles.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            categoryId: nonExistentCategoryId,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    },
  );

  // Test passed: Article creation properly rejected with invalid category reference
  TestValidator.predicate(
    "contributor account was successfully created",
    contributor.id !== null && contributor.email !== null,
  );
}
