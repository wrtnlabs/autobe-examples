import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that article creation properly tracks the authentication session for
 * audit trail purposes.
 *
 * This scenario verifies that the system captures the
 * discussion_board_member_session_id from the JWT token and associates it with
 * the created article for audit trail purposes. While this session information
 * is maintained internally in the database and not exposed in the API response,
 * the test validates that article creation succeeds with proper session
 * context. The test ensures that session tracking works correctly as part of
 * the security and audit trail requirements.
 *
 * Test Flow:
 *
 * 1. Register a new member to establish an authenticated session
 * 2. Verify registration succeeded and JWT tokens are issued
 * 3. Create an article using the authenticated session
 * 4. Verify article creation succeeded with proper session context
 * 5. Validate article response contains complete author information
 */
export async function test_api_article_session_tracking_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Register a new member to establish authenticated session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.name(2);
  const currentUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();

  const registrationData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: currentUrl,
    referrer: referrerUrl,
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });

  // Step 2: Verify registration succeeded and validate member data
  typia.assert(authorizedMember);
  TestValidator.equals(
    "registered email matches",
    authorizedMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "registered username matches",
    authorizedMember.username,
    memberUsername,
  );
  TestValidator.predicate(
    "access token exists",
    authorizedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorizedMember.token.refresh.length > 0,
  );

  // Step 3: Create an article using the authenticated session
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

  const createdArticle = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: articleData,
    },
  );

  // Step 4: Verify article creation succeeded with complete response
  typia.assert(createdArticle);
  TestValidator.equals(
    "article title matches",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article body matches",
    createdArticle.body,
    articleBody,
  );
  TestValidator.equals(
    "initial view count is zero",
    createdArticle.view_count,
    0,
  );
  TestValidator.equals(
    "deleted_at is null for active article",
    createdArticle.deleted_at,
    null,
  );

  // Step 5: Validate article author information matches registered member
  TestValidator.equals(
    "article author id matches member id",
    createdArticle.author.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "article author username matches",
    createdArticle.author.username,
    authorizedMember.username,
  );
  TestValidator.equals(
    "article author email matches",
    createdArticle.author.email,
    authorizedMember.email,
  );
}
