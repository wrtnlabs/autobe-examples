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
 * This scenario verifies that the system accepts and successfully creates
 * articles when title is exactly 200 characters (maximum) and body is exactly
 * 50,000 characters (maximum). The test ensures that content validation treats
 * these maximum values as inclusive boundaries, large content is persisted
 * without truncation, the database can handle the maximum body size, and the
 * complete content is returned in the response.
 *
 * Steps:
 *
 * 1. Register and authenticate as a member
 * 2. Generate title with exactly 200 characters (maximum allowed)
 * 3. Generate body with exactly 50,000 characters (maximum allowed)
 * 4. Create article with maximum-length content
 * 5. Verify article was created successfully
 * 6. Verify title length is exactly 200 characters
 * 7. Verify body length is exactly 50,000 characters
 * 8. Verify no content truncation occurred
 */
export async function test_api_article_creation_boundary_maximum_lengths(
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

  // Step 2: Generate title with exactly 200 characters (maximum allowed)
  const maxTitleLength = 200;
  let title = "";
  while (title.length < maxTitleLength) {
    const remaining = maxTitleLength - title.length;
    if (remaining >= 5) {
      title += RandomGenerator.alphabets(Math.min(remaining, 10));
    } else {
      title += RandomGenerator.alphabets(remaining);
    }
  }
  title = title.substring(0, maxTitleLength);

  TestValidator.equals(
    "title length is exactly 200",
    title.length,
    maxTitleLength,
  );

  // Step 3: Generate body with exactly 50,000 characters (maximum allowed)
  const maxBodyLength = 50000;
  let body = "";
  while (body.length < maxBodyLength) {
    const remaining = maxBodyLength - body.length;
    if (remaining >= 100) {
      body += RandomGenerator.paragraph({
        sentences: 20,
        wordMin: 3,
        wordMax: 7,
      });
    } else {
      body += RandomGenerator.alphabets(remaining);
    }
  }
  body = body.substring(0, maxBodyLength);

  TestValidator.equals(
    "body length is exactly 50000",
    body.length,
    maxBodyLength,
  );

  // Step 4: Create article with maximum-length content
  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: title,
        body: body,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );

  // Step 5: Verify article was created successfully
  typia.assert(article);

  // Step 6: Verify title length is exactly 200 characters
  TestValidator.equals(
    "created article title length is 200",
    article.title.length,
    maxTitleLength,
  );

  // Step 7: Verify body length is exactly 50,000 characters
  TestValidator.equals(
    "created article body length is 50000",
    article.body.length,
    maxBodyLength,
  );

  // Step 8: Verify no content truncation occurred
  TestValidator.equals("title content matches input", article.title, title);
  TestValidator.equals("body content matches input", article.body, body);
}
