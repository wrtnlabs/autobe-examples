import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that only the original comment author can update their comment, and
 * other members cannot update comments they did not create.
 *
 * This scenario validates the authorization logic that prevents unauthorized
 * comment modifications. The test creates two separate member accounts, has the
 * first member create an article and post a comment, then verifies that:
 *
 * 1. The second member CANNOT update the first member's comment (authorization
 *    failure)
 * 2. The original author CAN successfully update their own comment (authorization
 *    success)
 *
 * This ensures proper ownership verification and prevents malicious or
 * accidental modification of other users' comments.
 *
 * Steps:
 *
 * 1. Create first member account (original comment author)
 * 2. Save first member's authentication token
 * 3. First member creates an article
 * 4. First member posts a comment on the article
 * 5. Create second member account (unauthorized user) - overwrites connection
 *    token
 * 6. Second member attempts to update first member's comment (MUST FAIL)
 * 7. Restore first member's authentication token
 * 8. First member updates their own comment (MUST SUCCEED)
 * 9. Validate the comment was successfully updated
 */
export async function test_api_comment_update_authorization_verification(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (original comment author)
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = "SecurePassword123!";

  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      email: firstMemberEmail,
      password: firstMemberPassword,
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 2: Save first member's authentication token
  const firstMemberToken = firstMember.token.access;

  // Step 3: First member creates an article
  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: First member posts a comment on the article
  const originalCommentContent = RandomGenerator.paragraph({ sentences: 5 });
  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: originalCommentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment content matches original",
    comment.content,
    originalCommentContent,
  );

  // Step 5: Create second member account (unauthorized user)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberPassword = "AnotherPassword456!";

  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      email: secondMemberEmail,
      password: secondMemberPassword,
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 6: Second member attempts to update first member's comment (MUST FAIL)
  const unauthorizedUpdateContent = RandomGenerator.paragraph({ sentences: 4 });

  await TestValidator.error(
    "second member cannot update first member's comment",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: unauthorizedUpdateContent,
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );

  // Step 7: Restore first member's authentication token
  connection.headers = connection.headers || {};
  connection.headers.Authorization = firstMemberToken;

  // Step 8: First member updates their own comment (MUST SUCCEED)
  const authorizedUpdateContent = RandomGenerator.paragraph({ sentences: 6 });

  const updatedComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: authorizedUpdateContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  // Step 9: Validate the comment was successfully updated
  TestValidator.equals("comment ID unchanged", updatedComment.id, comment.id);
  TestValidator.equals(
    "comment content updated",
    updatedComment.content,
    authorizedUpdateContent,
  );
  TestValidator.notEquals(
    "comment content changed from original",
    updatedComment.content,
    originalCommentContent,
  );
}
