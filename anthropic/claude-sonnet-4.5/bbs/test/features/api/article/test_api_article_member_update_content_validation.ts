import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that article updates enforce the same content validation rules as
 * creation.
 *
 * This test validates that the discussion board system maintains consistent
 * data quality standards for article updates by enforcing the same validation
 * constraints as article creation. It systematically tests boundary conditions
 * for title length (5-200 characters) and body length (10-50,000 characters) to
 * ensure validation rules are properly applied during update operations.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Create a valid article meeting all content constraints
 * 3. Attempt update with title less than 5 characters - expect validation failure
 * 4. Attempt update with title exceeding 200 characters - expect validation
 *    failure
 * 5. Attempt update with body less than 10 characters - expect validation failure
 * 6. Attempt update with body exceeding 50,000 characters - expect validation
 *    failure
 * 7. Perform valid update with all constraints satisfied - expect success
 * 8. Verify update completed successfully with new content
 *
 * Business logic validations:
 *
 * - Title must be 5-200 characters for updates
 * - Body must be 10-50,000 characters for updates
 * - Failed validations do not modify article data
 * - Valid updates succeed after failed attempts
 */
export async function test_api_article_member_update_content_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "securePassword123";
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

  // Step 2: Create a valid article meeting all constraints
  const validTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });
  const validBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: validTitle,
        body: validBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Attempt update with title less than 5 characters
  const tooShortTitle = RandomGenerator.alphabets(3);
  await TestValidator.error(
    "update with title less than 5 characters should fail",
    async () => {
      await api.functional.discussionBoard.articles.update(connection, {
        articleId: article.id,
        body: {
          title: tooShortTitle,
        } satisfies IDiscussionBoardArticle.IUpdate,
      });
    },
  );

  // Step 4: Attempt update with title exceeding 200 characters
  const tooLongTitle = RandomGenerator.paragraph({
    sentences: 50,
    wordMin: 5,
    wordMax: 10,
  });
  await TestValidator.error(
    "update with title exceeding 200 characters should fail",
    async () => {
      await api.functional.discussionBoard.articles.update(connection, {
        articleId: article.id,
        body: {
          title: tooLongTitle,
        } satisfies IDiscussionBoardArticle.IUpdate,
      });
    },
  );

  // Step 5: Attempt update with body less than 10 characters
  const tooShortBody = RandomGenerator.alphabets(7);
  await TestValidator.error(
    "update with body less than 10 characters should fail",
    async () => {
      await api.functional.discussionBoard.articles.update(connection, {
        articleId: article.id,
        body: {
          body: tooShortBody,
        } satisfies IDiscussionBoardArticle.IUpdate,
      });
    },
  );

  // Step 6: Attempt update with body exceeding 50,000 characters
  const tooLongBody = ArrayUtil.repeat(100, () =>
    RandomGenerator.content({
      paragraphs: 10,
      sentenceMin: 50,
      sentenceMax: 80,
      wordMin: 5,
      wordMax: 10,
    }),
  ).join("\n\n");
  await TestValidator.error(
    "update with body exceeding 50000 characters should fail",
    async () => {
      await api.functional.discussionBoard.articles.update(connection, {
        articleId: article.id,
        body: {
          body: tooLongBody,
        } satisfies IDiscussionBoardArticle.IUpdate,
      });
    },
  );

  // Step 7: Perform valid update with all constraints satisfied
  const newValidTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 6,
  });
  const newValidBody = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 20,
    sentenceMax: 30,
    wordMin: 5,
    wordMax: 9,
  });

  const updatedArticle = await api.functional.discussionBoard.articles.update(
    connection,
    {
      articleId: article.id,
      body: {
        title: newValidTitle,
        body: newValidBody,
      } satisfies IDiscussionBoardArticle.IUpdate,
    },
  );
  typia.assert(updatedArticle);

  // Step 8: Verify update completed successfully
  TestValidator.equals(
    "updated title matches new title",
    updatedArticle.title,
    newValidTitle,
  );
  TestValidator.equals(
    "updated body matches new body",
    updatedArticle.body,
    newValidBody,
  );
  TestValidator.equals(
    "article ID remains unchanged",
    updatedArticle.id,
    article.id,
  );
}
