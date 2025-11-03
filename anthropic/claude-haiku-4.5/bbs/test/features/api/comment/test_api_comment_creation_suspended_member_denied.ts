import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that members can successfully create comments on articles.
 *
 * This test validates the comment creation functionality for authenticated
 * members. It verifies that a registered member can post comments on existing
 * articles and that the created comment is properly returned with correct
 * metadata and properties.
 *
 * Test workflow:
 *
 * 1. Register a new member account
 * 2. Create an article for testing comment creation
 * 3. Create a comment on the article
 * 4. Verify the comment is created successfully with correct properties
 * 5. Verify the comment metadata (author, content, status) is accurate
 */
export async function test_api_comment_creation_suspended_member_denied(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123"; // Meeting requirements: 8+ chars, uppercase, lowercase, number

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(authorizedMember);

  const memberToken = authorizedMember.token.access;

  // Step 2: Create an article for testing comment creation
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({ paragraphs: 2 });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Create a connection with the authenticated member
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: memberToken,
    },
  };

  // Step 4: Create a comment on the article
  const commentContent = RandomGenerator.paragraph({ sentences: 5 });

  const createdComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(createdComment);

  // Step 5: Verify the comment was created successfully
  TestValidator.equals(
    "created comment belongs to correct article",
    createdComment.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "created comment has correct content",
    createdComment.content,
    commentContent,
  );

  TestValidator.equals(
    "created comment status is published",
    createdComment.status,
    "published",
  );

  TestValidator.equals(
    "created comment author ID matches member",
    createdComment.discussion_board_member_id,
    authorizedMember.id,
  );
}
