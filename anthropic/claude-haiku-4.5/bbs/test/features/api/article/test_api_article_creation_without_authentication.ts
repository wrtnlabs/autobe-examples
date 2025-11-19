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
 * Test article creation without authentication.
 *
 * This test validates that the article creation endpoint properly enforces
 * authentication requirements. It verifies that unauthenticated requests are
 * rejected with a 401 Unauthorized response, preventing unauthorized users from
 * creating articles in the discussion board system.
 *
 * The test follows these steps:
 *
 * 1. Prepare article creation data
 * 2. Create an unauthenticated connection (empty headers)
 * 3. Attempt to create an article without valid JWT token
 * 4. Verify that the operation fails with 401 Unauthorized error
 * 5. Confirm that authentication is mandatory for article creation
 */
export async function test_api_article_creation_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Prepare article creation data
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    categoryId: typia.random<string & tags.Format<"uuid">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticle.ICreate;

  // Step 2: Create an unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Attempt to create an article without valid JWT token
  // Step 4: Verify that the operation fails with 401 Unauthorized error
  await TestValidator.httpError(
    "article creation without authentication should return 401 Unauthorized",
    401,
    async () => {
      return await api.functional.discussionBoard.contributor.articles.create(
        unauthenticatedConnection,
        {
          body: articleData,
        },
      );
    },
  );

  // Step 5: Confirm that authentication is mandatory for article creation
  TestValidator.predicate(
    "unauthenticated connection has no authorization header",
    !unauthenticatedConnection.headers?.Authorization,
  );
}
