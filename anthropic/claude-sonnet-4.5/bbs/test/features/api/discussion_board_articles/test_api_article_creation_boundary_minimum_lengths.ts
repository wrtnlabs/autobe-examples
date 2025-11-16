import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test article creation with minimum allowed content lengths to validate lower
 * boundary conditions.
 *
 * This scenario verifies that the system accepts and successfully creates
 * articles when title is exactly 5 characters (minimum) and body is exactly 10
 * characters (minimum). The test ensures that content validation treats these
 * minimum values as inclusive boundaries, the article is persisted correctly,
 * and all metadata is properly initialized.
 *
 * Steps:
 *
 * 1. Register and authenticate a member account
 * 2. Create article with exactly 5 character title (minimum boundary)
 * 3. Create article with exactly 10 character body (minimum boundary)
 * 4. Create article with both title and body at exact minimum lengths
 * 5. Validate successful creation and proper metadata initialization
 */
export async function test_api_article_creation_boundary_minimum_lengths(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123",
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create article with exactly 5 character title (minimum boundary)
  const minTitleArticle = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: "abcde",
        body: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(minTitleArticle);

  // Validate title length is exactly 5
  TestValidator.equals(
    "title length is minimum 5",
    minTitleArticle.title.length,
    5,
  );

  // Validate metadata initialization
  TestValidator.equals(
    "view count initialized to 0",
    minTitleArticle.view_count,
    0,
  );
  TestValidator.equals("deleted_at is null", minTitleArticle.deleted_at, null);
  TestValidator.equals(
    "author id matches member",
    minTitleArticle.author.id,
    member.id,
  );

  // Step 3: Create article with exactly 10 character body (minimum boundary)
  const minBodyArticle = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        body: "abcdefghij",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(minBodyArticle);

  // Validate body length is exactly 10
  TestValidator.equals(
    "body length is minimum 10",
    minBodyArticle.body.length,
    10,
  );

  // Validate metadata initialization
  TestValidator.equals(
    "view count initialized to 0",
    minBodyArticle.view_count,
    0,
  );
  TestValidator.equals("deleted_at is null", minBodyArticle.deleted_at, null);
  TestValidator.equals(
    "author id matches member",
    minBodyArticle.author.id,
    member.id,
  );

  // Step 4: Create article with both title and body at exact minimum lengths
  const minBothArticle = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: "12345",
        body: "1234567890",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(minBothArticle);

  // Validate both title and body are at minimum lengths
  TestValidator.equals(
    "title length is exactly 5",
    minBothArticle.title.length,
    5,
  );
  TestValidator.equals(
    "body length is exactly 10",
    minBothArticle.body.length,
    10,
  );

  // Validate content matches what was sent
  TestValidator.equals("title content matches", minBothArticle.title, "12345");
  TestValidator.equals(
    "body content matches",
    minBothArticle.body,
    "1234567890",
  );

  // Validate metadata initialization
  TestValidator.equals(
    "view count initialized to 0",
    minBothArticle.view_count,
    0,
  );
  TestValidator.equals("deleted_at is null", minBothArticle.deleted_at, null);
  TestValidator.equals(
    "author id matches member",
    minBothArticle.author.id,
    member.id,
  );
  TestValidator.equals(
    "author username matches",
    minBothArticle.author.username,
    member.username,
  );
  TestValidator.equals(
    "author email matches",
    minBothArticle.author.email,
    member.email,
  );

  // Validate timestamps are properly set
  TestValidator.predicate(
    "created_at is valid date",
    new Date(minBothArticle.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(minBothArticle.updated_at).getTime() > 0,
  );
}
