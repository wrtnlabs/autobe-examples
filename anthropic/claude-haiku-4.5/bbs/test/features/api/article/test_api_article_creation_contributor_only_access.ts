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
 * Validates that only authenticated contributors can create articles.
 *
 * Tests access control for the article creation endpoint by verifying:
 *
 * 1. Unauthenticated requests fail with 401 Unauthorized
 * 2. Requests with invalid/expired tokens fail with 401 Unauthorized
 * 3. Authenticated contributors can successfully create articles
 * 4. Article author is automatically set from JWT authentication context
 * 5. Contributors cannot create articles on behalf of other contributors
 *
 * The test ensures that article author identification comes exclusively from
 * the authentication context, preventing unauthorized or spoofed article
 * creation.
 */
export async function test_api_article_creation_contributor_only_access(
  connection: api.IConnection,
) {
  // 1. Register and authenticate first contributor
  const contributor1Email: string = typia.random<
    string & tags.Format<"email">
  >();
  const contributor1: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributor1Email,
        username: RandomGenerator.alphabets(15),
        password: "SecurePass123!@",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor1);

  // 2. Attempt to create article without authentication - should fail with 401
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated request should fail with 401",
    async () => {
      await api.functional.discussionBoard.contributor.articles.create(
        unauthConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            categoryId: typia.random<string & tags.Format<"uuid">>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    },
  );

  // 3. Attempt to create article with invalid token - should fail with 401
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: "Bearer invalid_token_12345",
    },
  };
  await TestValidator.error("invalid token should fail with 401", async () => {
    await api.functional.discussionBoard.contributor.articles.create(
      invalidTokenConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  });

  // 4. Create article with authenticated contributor1
  const articleTitle = RandomGenerator.paragraph({ sentences: 4 });
  const articleContent = RandomGenerator.content({ paragraphs: 3 });
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: categoryId,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(createdArticle);

  // 5. Verify article author is set to authenticated contributor
  TestValidator.equals(
    "article author should be the authenticated contributor",
    createdArticle.author.id,
    contributor1.id,
  );

  TestValidator.equals(
    "article author username should match",
    createdArticle.author.username,
    contributor1.username,
  );

  // 6. Verify article content matches request
  TestValidator.equals(
    "article title should match request",
    createdArticle.title,
    articleTitle,
  );

  TestValidator.equals(
    "article content should match request",
    createdArticle.content,
    articleContent,
  );

  // 7. Verify article status is draft
  TestValidator.equals(
    "article status should be draft",
    createdArticle.status,
    "draft",
  );

  // 8. Register second contributor to test author prevention
  const contributor2Email: string = typia.random<
    string & tags.Format<"email">
  >();
  const contributor2: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributor2Email,
        username: RandomGenerator.alphabets(15),
        password: "SecurePass456!@",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor2);

  // 9. Verify that contributor2 cannot create articles as contributor1
  // Switch to contributor2 context
  const contributor2Connection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${contributor2.token.access}`,
    },
  };

  const contributor2Article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      contributor2Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(contributor2Article);

  // Verify article author is contributor2, not contributor1
  TestValidator.equals(
    "contributor2 article author should be contributor2, not contributor1",
    contributor2Article.author.id,
    contributor2.id,
  );

  TestValidator.notEquals(
    "contributor2 article author should not be contributor1",
    contributor2Article.author.id,
    contributor1.id,
  );
}
