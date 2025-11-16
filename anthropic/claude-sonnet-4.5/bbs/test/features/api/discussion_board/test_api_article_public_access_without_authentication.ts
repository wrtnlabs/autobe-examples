import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test that article search is publicly accessible without authentication.
 *
 * This test validates that the discussion board platform supports open content
 * discovery, allowing guest users to search and browse articles about economic
 * and political discussions without requiring user registration or
 * authentication.
 *
 * Test Flow:
 *
 * 1. Create an authenticated member account to author test articles
 * 2. Create multiple articles with diverse content while authenticated
 * 3. Create a fresh unauthenticated connection (no JWT tokens)
 * 4. Perform article search using the unauthenticated connection
 * 5. Validate search returns proper article summaries with complete metadata
 * 6. Verify no authentication errors occur during public access
 */
export async function test_api_article_public_access_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create member account to author articles
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123!";
  const memberUsername = RandomGenerator.name(2);

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create multiple test articles with varied content
  const articlesToCreate = 5;
  const createdArticles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < articlesToCreate; i++) {
    const article: IDiscussionBoardArticle =
      await api.functional.discussionBoard.articles.create(connection, {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          body: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardArticle.ICreate,
      });
    typia.assert(article);
    createdArticles.push(article);
  }

  TestValidator.equals(
    "created articles count",
    createdArticles.length,
    articlesToCreate,
  );

  // Step 3: Create unauthenticated connection (no JWT tokens in headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 4: Perform article search WITHOUT authentication
  const searchResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(unauthConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult);

  // Step 5: Validate search returned results
  TestValidator.predicate(
    "search returned articles",
    searchResult.data.length > 0,
  );

  // Step 6: Verify at least one of our created articles appears in the search results
  const foundCreatedArticle = searchResult.data.find((summary) =>
    createdArticles.some((created) => created.id === summary.id),
  );

  TestValidator.predicate(
    "at least one created article found in public search results",
    foundCreatedArticle !== undefined,
  );
}
