import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test article creation with maximum allowed content lengths to validate upper
 * boundary conditions.
 *
 * This test verifies that the system correctly handles articles with maximum
 * allowed lengths:
 *
 * - Title at exactly 200 characters (maximum allowed)
 * - Body at exactly 50,000 characters (maximum allowed)
 *
 * The test ensures:
 *
 * 1. Maximum boundary values are accepted by the validation
 * 2. Large content is successfully persisted without truncation
 * 3. The response returns the complete article with all content intact
 * 4. Length constraints are inclusive of the maximum values
 *
 * This validates the system's ability to handle large article bodies and proper
 * implementation of maximum length constraints.
 */
export async function test_api_article_creation_with_maximum_length_content(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123";
  const memberUsername = RandomGenerator.name();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Generate article content with maximum allowed lengths
  // Title: exactly 200 characters (maximum allowed)
  const maxTitleLength = 200;
  const articleTitle = RandomGenerator.alphabets(maxTitleLength);

  // Body: exactly 50,000 characters (maximum allowed)
  const maxBodyLength = 50000;
  const articleBody = RandomGenerator.alphabets(maxBodyLength);

  // Step 3: Create article with maximum length content
  const createdArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(createdArticle);

  // Step 4: Validate the created article content matches input exactly
  TestValidator.equals(
    "article title matches input",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article body matches input",
    createdArticle.body,
    articleBody,
  );
  TestValidator.equals(
    "article title length is 200",
    createdArticle.title.length,
    maxTitleLength,
  );
  TestValidator.equals(
    "article body length is 50000",
    createdArticle.body.length,
    maxBodyLength,
  );

  // Step 5: Verify article metadata
  TestValidator.predicate(
    "article has valid UUID",
    createdArticle.id.length > 0,
  );
  TestValidator.equals("article view count is 0", createdArticle.view_count, 0);
  TestValidator.equals(
    "article is not deleted",
    createdArticle.deleted_at,
    null,
  );

  // Step 6: Verify author information
  TestValidator.equals(
    "article author id matches member",
    createdArticle.author.id,
    member.id,
  );
  TestValidator.equals(
    "article author username matches",
    createdArticle.author.username,
    memberUsername,
  );
  TestValidator.equals(
    "article author email matches",
    createdArticle.author.email,
    memberEmail,
  );
}
