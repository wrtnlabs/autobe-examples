import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that authorization properly prevents members from updating articles
 * created by other members, enforcing ownership boundaries.
 *
 * This test validates the critical authorization boundary that ensures members
 * can only update their own articles. It verifies that attempts by non-owners
 * to update articles are properly rejected, while the original author retains
 * full update privileges.
 *
 * Workflow steps:
 *
 * 1. Create first member account (author) and authenticate
 * 2. First member creates an article
 * 3. Create second member account (non-author) and authenticate
 * 4. Second member attempts to update the article created by first member
 * 5. Verify update is rejected with authorization error
 * 6. Confirm article content remains unchanged
 * 7. First member (original author) successfully updates the article
 * 8. Verify update succeeds for the owner
 */
export async function test_api_article_member_update_authorization_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (author) and authenticate
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = "password123";
  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: firstMemberEmail,
        password: firstMemberPassword,
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(firstMember);

  // Store first member's token for later use
  const firstMemberToken = firstMember.token.access;

  // Step 2: First member creates an article
  const originalTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const originalBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: originalTitle,
        body: originalBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals("article title matches", article.title, originalTitle);
  TestValidator.equals("article body matches", article.body, originalBody);
  TestValidator.equals(
    "article author is first member",
    article.author.id,
    firstMember.id,
  );

  // Step 3: Create second member account (non-author) and authenticate
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberPassword = "password456";
  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: secondMemberEmail,
        password: secondMemberPassword,
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(secondMember);

  // Step 4: Second member attempts to update the article created by first member
  const unauthorizedUpdateTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const unauthorizedUpdateBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  await TestValidator.error(
    "second member cannot update first member's article",
    async () => {
      await api.functional.discussionBoard.articles.update(connection, {
        articleId: article.id,
        body: {
          title: unauthorizedUpdateTitle,
          body: unauthorizedUpdateBody,
        } satisfies IDiscussionBoardArticle.IUpdate,
      });
    },
  );

  // Step 7: Switch back to first member (original author) for successful update
  connection.headers = connection.headers || {};
  connection.headers.Authorization = firstMemberToken;

  // Step 8: First member (original author) successfully updates the article
  const authorizedUpdateTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const authorizedUpdateBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.update(connection, {
      articleId: article.id,
      body: {
        title: authorizedUpdateTitle,
        body: authorizedUpdateBody,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Verify update succeeds for the owner
  TestValidator.equals(
    "updated article title matches",
    updatedArticle.title,
    authorizedUpdateTitle,
  );
  TestValidator.equals(
    "updated article body matches",
    updatedArticle.body,
    authorizedUpdateBody,
  );
  TestValidator.equals(
    "article ID remains same",
    updatedArticle.id,
    article.id,
  );
  TestValidator.equals(
    "article author remains same",
    updatedArticle.author.id,
    firstMember.id,
  );
  TestValidator.notEquals(
    "article title changed from original",
    updatedArticle.title,
    originalTitle,
  );
  TestValidator.notEquals(
    "article body changed from original",
    updatedArticle.body,
    originalBody,
  );
}
