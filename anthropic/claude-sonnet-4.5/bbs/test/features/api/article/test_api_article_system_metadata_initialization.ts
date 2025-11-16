import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that all system-managed metadata fields are correctly initialized during
 * article creation.
 *
 * This test validates that the system automatically generates and initializes
 * fields that should never be provided in the request body: id (auto-generated
 * UUID format), view_count (initialized to exactly 0), created_at and
 * updated_at (set to current timestamp), and deleted_at (initialized to null).
 * The test verifies that these fields are present in the response with correct
 * initial values, follow expected formats (UUID for id, ISO 8601 for
 * timestamps), and that created_at and updated_at are set to approximately the
 * same time indicating fresh creation.
 *
 * Steps:
 *
 * 1. Authenticate as a member to obtain authorization
 * 2. Create a new article with only user-provided fields (title and body)
 * 3. Verify that all system-managed metadata fields are correctly initialized
 * 4. Validate that view_count is exactly 0
 * 5. Validate that created_at and updated_at are approximately the same (within
 *    reasonable time window)
 * 6. Validate that deleted_at is null
 * 7. Validate that author information is populated correctly
 */
export async function test_api_article_system_metadata_initialization(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Create a new article with only user-provided fields
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 3: Validate all system-managed metadata fields

  // Validate view_count is initialized to exactly 0
  TestValidator.equals(
    "view_count should be initialized to exactly 0",
    createdArticle.view_count,
    0,
  );

  // Validate that created_at and updated_at are approximately the same (within 5 seconds)
  const createdAtTime = new Date(createdArticle.created_at).getTime();
  const updatedAtTime = new Date(createdArticle.updated_at).getTime();
  const timeDifference = Math.abs(createdAtTime - updatedAtTime);

  TestValidator.predicate(
    "created_at and updated_at should be approximately the same (within 5 seconds)",
    timeDifference < 5000,
  );

  // Validate deleted_at is initialized to null
  TestValidator.equals(
    "deleted_at should be initialized to null",
    createdArticle.deleted_at,
    null,
  );

  // Validate author information is populated correctly
  TestValidator.equals(
    "author id should match authenticated member id",
    createdArticle.author.id,
    authenticatedMember.id,
  );

  TestValidator.equals(
    "author username should match authenticated member username",
    createdArticle.author.username,
    authenticatedMember.username,
  );

  TestValidator.equals(
    "author email should match authenticated member email",
    createdArticle.author.email,
    authenticatedMember.email,
  );
}
