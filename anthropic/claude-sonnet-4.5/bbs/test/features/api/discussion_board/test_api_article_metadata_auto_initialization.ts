import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test automatic initialization of all system-managed metadata fields during
 * article creation.
 *
 * This test validates that the system correctly auto-generates and initializes
 * fields excluded from the request body: id (UUID format), view_count (exactly
 * 0), created_at and updated_at (current timestamp in ISO 8601 format), and
 * deleted_at (null for active articles).
 *
 * The test verifies that all these fields are present in the response, follow
 * the correct formats, view_count is precisely 0, timestamps are recent and
 * approximately equal (indicating fresh creation), and deleted_at is null
 * indicating active publication status.
 *
 * Steps:
 *
 * 1. Register a new member to obtain authentication
 * 2. Create an article with only user-provided content (title and body)
 * 3. Validate all system-managed metadata fields are correctly initialized
 * 4. Verify UUID format, timestamp formats, and initial values
 * 5. Confirm timestamps are recent and created_at ≈ updated_at
 */
export async function test_api_article_metadata_auto_initialization(
  connection: api.IConnection,
) {
  // Step 1: Register a new member for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const memberUsername = RandomGenerator.name();

  const registrationData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(member);

  // Step 2: Create an article with only user-provided content
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const articleData = {
    title: articleTitle,
    body: articleBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  // Record time just before creation to verify timestamps are recent
  const beforeCreation = new Date();

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });

  // Record time just after creation
  const afterCreation = new Date();

  typia.assert(createdArticle);

  // Step 3: Validate system-managed metadata fields

  // Validate view_count - must be exactly 0
  TestValidator.equals("view_count is exactly 0", createdArticle.view_count, 0);

  // Validate deleted_at - must be null for active article
  TestValidator.equals(
    "deleted_at is null for active article",
    createdArticle.deleted_at,
    null,
  );

  // Step 4: Validate timestamps are recent and approximately equal
  const createdAtDate = new Date(createdArticle.created_at);
  const updatedAtDate = new Date(createdArticle.updated_at);

  // Verify created_at is within the test execution timeframe (between before and after)
  TestValidator.predicate(
    "created_at is recent (within test execution)",
    createdAtDate >= beforeCreation && createdAtDate <= afterCreation,
  );

  // Verify updated_at is within the test execution timeframe
  TestValidator.predicate(
    "updated_at is recent (within test execution)",
    updatedAtDate >= beforeCreation && updatedAtDate <= afterCreation,
  );

  // Verify created_at and updated_at are approximately equal (within 1 second)
  const timeDifference = Math.abs(
    createdAtDate.getTime() - updatedAtDate.getTime(),
  );
  TestValidator.predicate(
    "created_at and updated_at are approximately equal (< 1 second)",
    timeDifference < 1000,
  );

  // Step 5: Validate author information is populated correctly
  TestValidator.equals(
    "author id matches authenticated member",
    createdArticle.author.id,
    member.id,
  );
  TestValidator.equals(
    "author username matches member username",
    createdArticle.author.username,
    member.username,
  );
  TestValidator.equals(
    "author email matches member email",
    createdArticle.author.email,
    member.email,
  );

  // Validate user-provided content was stored correctly
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
}
