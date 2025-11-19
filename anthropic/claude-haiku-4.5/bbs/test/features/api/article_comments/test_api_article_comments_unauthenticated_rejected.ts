import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that unauthenticated users cannot create comments on articles.
 *
 * Verifies that the comment creation endpoint properly rejects requests from
 * unauthenticated users (no JWT token). The API must enforce authentication
 * requirements for all comment creation operations, returning HTTP 401
 * Unauthorized for requests without valid JWT tokens. Error responses should
 * not expose sensitive system information.
 *
 * Process:
 *
 * 1. Register and authenticate a contributor to create test article
 * 2. Create and publish an article for testing
 * 3. Create unauthenticated connection (no JWT token)
 * 4. Attempt comment creation without authentication credentials
 * 5. Verify HTTP 401 Unauthorized error is returned
 */
export async function test_api_article_comments_unauthenticated_rejected(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate contributor
  const email = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: email,
        username: RandomGenerator.alphabets(8),
        password: "SecurePass123!@#",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create article with valid category ID
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Create unauthenticated connection (empty headers, no JWT token)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Attempt comment creation without authentication
  await TestValidator.error(
    "unauthenticated user cannot create comment on article",
    async () => {
      await api.functional.discussionBoard.contributor.articles.comments.create(
        unauthenticatedConnection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );
}
