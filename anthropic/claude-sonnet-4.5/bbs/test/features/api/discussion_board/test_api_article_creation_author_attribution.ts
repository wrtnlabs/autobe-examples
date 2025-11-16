import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test article author attribution security and accuracy.
 *
 * This test validates that article author information is correctly extracted
 * from JWT authentication tokens and cannot be spoofed through request
 * manipulation.
 *
 * Workflow:
 *
 * 1. Create Member A and authenticate
 * 2. Member A creates an article
 * 3. Verify article author matches Member A's information
 * 4. Create Member B and authenticate
 * 5. Member B creates an article
 * 6. Verify article author matches Member B's information
 * 7. Confirm different members have different author attributions
 */
export async function test_api_article_creation_author_attribution(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (Member A) and authenticate
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAData = {
    email: memberAEmail,
    password: "SecurePassword123!",
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberA: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberAData,
    });
  typia.assert(memberA);

  // Step 2: Member A creates an article
  const articleAData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleA: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleAData,
    });
  typia.assert(articleA);

  // Step 3: Verify article.author contains Member A's information
  TestValidator.equals(
    "Article A author ID matches Member A ID",
    articleA.author.id,
    memberA.id,
  );
  TestValidator.equals(
    "Article A author username matches Member A username",
    articleA.author.username,
    memberA.username,
  );
  TestValidator.equals(
    "Article A author email matches Member A email",
    articleA.author.email,
    memberA.email,
  );
  TestValidator.equals(
    "Article A author status matches Member A status",
    articleA.author.status,
    memberA.status,
  );
  TestValidator.equals(
    "Article A author email_verified matches Member A email_verified",
    articleA.author.email_verified,
    memberA.email_verified,
  );
  TestValidator.equals(
    "Article A author created_at matches Member A created_at",
    articleA.author.created_at,
    memberA.created_at,
  );

  // Step 4: Create second member account (Member B) and authenticate
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBData = {
    email: memberBEmail,
    password: "AnotherSecurePass456!",
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberB: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBData,
    });
  typia.assert(memberB);

  // Step 5: Member B creates an article
  const articleBData = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 4,
      sentenceMin: 12,
      sentenceMax: 18,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleB: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBData,
    });
  typia.assert(articleB);

  // Step 6: Verify article.author contains Member B's information (different from Member A)
  TestValidator.equals(
    "Article B author ID matches Member B ID",
    articleB.author.id,
    memberB.id,
  );
  TestValidator.equals(
    "Article B author username matches Member B username",
    articleB.author.username,
    memberB.username,
  );
  TestValidator.equals(
    "Article B author email matches Member B email",
    articleB.author.email,
    memberB.email,
  );
  TestValidator.equals(
    "Article B author status matches Member B status",
    articleB.author.status,
    memberB.status,
  );
  TestValidator.equals(
    "Article B author email_verified matches Member B email_verified",
    articleB.author.email_verified,
    memberB.email_verified,
  );
  TestValidator.equals(
    "Article B author created_at matches Member B created_at",
    articleB.author.created_at,
    memberB.created_at,
  );

  // Step 7: Validate that articles created by different members have different author attributions
  TestValidator.notEquals(
    "Article A and Article B have different author IDs",
    articleA.author.id,
    articleB.author.id,
  );
  TestValidator.notEquals(
    "Article A and Article B have different author emails",
    articleA.author.email,
    articleB.author.email,
  );
  TestValidator.notEquals(
    "Article A and Article B have different author usernames",
    articleA.author.username,
    articleB.author.username,
  );
}
