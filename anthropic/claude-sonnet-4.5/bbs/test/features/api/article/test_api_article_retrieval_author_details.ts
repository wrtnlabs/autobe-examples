import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that retrieving an article returns complete author information in a
 * single atomic operation.
 *
 * This test validates the author field transformation from foreign key to
 * complete member summary. It ensures that when an article is retrieved, the
 * author field is populated with complete IDiscussionBoardMember.ISummary data
 * without requiring additional member lookup requests.
 *
 * Test Flow:
 *
 * 1. Create a member account with specific details (username, email, status)
 * 2. Authenticate as that member
 * 3. Create an article with that member
 * 4. Retrieve the article
 * 5. Verify the author field is populated with complete
 *    IDiscussionBoardMember.ISummary data
 * 6. Validate author.id matches the creating member's id
 * 7. Validate author.username, author.email match the member's registration data
 * 8. Verify author.status, author.email_verified, author.created_at are included
 * 9. Confirm no additional API calls are needed to get author details
 * 10. Ensure the article-author relationship is correctly represented
 */
export async function test_api_article_retrieval_author_details(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with specific details
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name(2);
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const registrationBody = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(authorizedMember);

  // Step 2: Verify member creation and store member details for comparison
  const memberId = authorizedMember.id;
  const memberUsernameCreated = authorizedMember.username;
  const memberEmailCreated = authorizedMember.email;
  const memberStatus = authorizedMember.status;
  const memberEmailVerified = authorizedMember.email_verified;
  const memberCreatedAt = authorizedMember.created_at;

  TestValidator.equals(
    "member email matches",
    authorizedMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "member username matches",
    authorizedMember.username,
    memberUsername,
  );

  // Step 3: Create an article with the authenticated member
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const articleCreateBody = {
    title: articleTitle,
    body: articleBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleCreateBody,
    });
  typia.assert(createdArticle);

  // Step 4: Retrieve the article
  const retrievedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(retrievedArticle);

  // Step 5: Verify the author field is populated with complete IDiscussionBoardMember.ISummary data
  TestValidator.predicate(
    "author field is populated",
    retrievedArticle.author !== null && retrievedArticle.author !== undefined,
  );

  // Step 6: Validate author.id matches the creating member's id
  TestValidator.equals(
    "author id matches creating member id",
    retrievedArticle.author.id,
    memberId,
  );

  // Step 7: Validate author.username, author.email match the member's registration data
  TestValidator.equals(
    "author username matches member username",
    retrievedArticle.author.username,
    memberUsernameCreated,
  );

  TestValidator.equals(
    "author email matches member email",
    retrievedArticle.author.email,
    memberEmailCreated,
  );

  // Step 8: Verify author.status, author.email_verified, author.created_at are included
  TestValidator.predicate(
    "author status is present",
    retrievedArticle.author.status !== null &&
      retrievedArticle.author.status !== undefined,
  );

  TestValidator.equals(
    "author status matches member status",
    retrievedArticle.author.status,
    memberStatus,
  );

  TestValidator.predicate(
    "author email_verified is present",
    retrievedArticle.author.email_verified !== null &&
      retrievedArticle.author.email_verified !== undefined,
  );

  TestValidator.equals(
    "author email_verified matches member email_verified",
    retrievedArticle.author.email_verified,
    memberEmailVerified,
  );

  TestValidator.predicate(
    "author created_at is present",
    retrievedArticle.author.created_at !== null &&
      retrievedArticle.author.created_at !== undefined,
  );

  TestValidator.equals(
    "author created_at matches member created_at",
    retrievedArticle.author.created_at,
    memberCreatedAt,
  );

  // Step 9: Verify article-author relationship is correctly represented
  TestValidator.equals(
    "article title matches created title",
    retrievedArticle.title,
    articleTitle,
  );

  TestValidator.equals(
    "article body matches created body",
    retrievedArticle.body,
    articleBody,
  );

  TestValidator.equals(
    "article id matches created article id",
    retrievedArticle.id,
    createdArticle.id,
  );
}
