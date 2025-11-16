import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test article creation with minimum allowed content lengths to validate
 * boundary conditions.
 *
 * This test verifies that the discussion board system correctly accepts
 * articles with minimum allowed content lengths. The validation ensures that:
 *
 * 1. Title with exactly 5 characters (minimum boundary) is accepted
 * 2. Body with exactly 10 characters (minimum boundary) is accepted
 * 3. Article creation succeeds with minimum valid content
 * 4. All system-managed fields are properly initialized
 * 5. Author information is correctly associated with the created article
 *
 * Test workflow:
 *
 * 1. Register and authenticate a member account
 * 2. Create an article with minimum length title (5 characters) and body (10
 *    characters)
 * 3. Validate the article was successfully created with all required fields
 * 4. Verify the minimum length constraints are inclusive (exactly 5 and 10
 *    characters work)
 */
export async function test_api_article_creation_with_minimum_length_content(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123";
  const memberUsername = RandomGenerator.name();

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(authenticatedMember);

  // Step 2: Create article with minimum allowed lengths (5 for title, 10 for body)
  // These lengths represent the inclusive minimum boundaries per IDiscussionBoardArticle.ICreate schema
  const minLengthTitle = RandomGenerator.alphabets(5);
  const minLengthBody = RandomGenerator.alphabets(10);

  TestValidator.equals("title length is exactly 5", minLengthTitle.length, 5);
  TestValidator.equals("body length is exactly 10", minLengthBody.length, 10);

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: minLengthTitle,
        body: minLengthBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(createdArticle);

  // Step 3: Validate article creation with minimum content lengths
  TestValidator.equals(
    "created article title matches input",
    createdArticle.title,
    minLengthTitle,
  );
  TestValidator.equals(
    "created article body matches input",
    createdArticle.body,
    minLengthBody,
  );
  TestValidator.equals(
    "article author ID matches member",
    createdArticle.author.id,
    authenticatedMember.id,
  );
  TestValidator.equals(
    "article author username matches",
    createdArticle.author.username,
    memberUsername,
  );
  TestValidator.equals(
    "view count initialized to 0",
    createdArticle.view_count,
    0,
  );
  TestValidator.predicate(
    "deleted_at is null for new article",
    createdArticle.deleted_at === null,
  );
}
