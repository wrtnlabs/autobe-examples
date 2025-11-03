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
 * Test creating a nested reply comment (child comment) in response to an
 * existing top-level comment.
 *
 * This test validates the complete nested discussion workflow including:
 *
 * 1. Member registration for authentication
 * 2. Article creation as the discussion container
 * 3. Parent comment creation on the article (top-level)
 * 4. Reply comment creation referencing the parent comment
 * 5. Verification of parent-child relationships
 * 6. Verification of thread depth (1 for direct replies)
 * 7. Verification of article association
 * 8. Verification of nested discussion structure
 */
export async function test_api_comment_reply_nested_structure(
  connection: api.IConnection,
) {
  // Step 1: Register a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123",
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAuth);
  TestValidator.equals(
    "member authenticated with token",
    typeof memberAuth.token.access,
    "string",
  );

  // Step 2: Create an article for discussion
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);
  TestValidator.equals(
    "article created successfully",
    typeof article.id,
    "string",
  );

  // Step 3: Create a parent comment on the article (top-level)
  const parentCommentData = {
    content: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const parentComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: parentCommentData,
      },
    );
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment created",
    typeof parentComment.id,
    "string",
  );
  TestValidator.equals(
    "parent comment thread depth is 0",
    parentComment.thread_depth,
    0,
  );
  TestValidator.equals(
    "parent comment belongs to article",
    parentComment.discussion_board_article_id,
    article.id,
  );

  // Step 4: Create a reply comment referencing the parent comment
  const replyCommentData = {
    content: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    parent_comment_id: parentComment.id,
  } satisfies IDiscussionBoardComment.ICreate;

  const replyComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: replyCommentData,
      },
    );
  typia.assert(replyComment);

  // Step 5: Verify parent-child relationships
  TestValidator.equals(
    "reply comment has parent reference",
    replyComment.parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "reply references correct parent",
    typeof replyComment.parent_comment_id,
    "string",
  );

  // Step 6: Verify thread depth is 1 for direct replies
  TestValidator.equals(
    "reply comment thread depth is 1",
    replyComment.thread_depth,
    1,
  );

  // Step 7: Verify the reply is associated with the same article as the parent
  TestValidator.equals(
    "reply comment article matches parent article",
    replyComment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "reply comment belongs to same article as parent",
    replyComment.discussion_board_article_id,
    parentComment.discussion_board_article_id,
  );

  // Step 8: Verify nested discussion structure
  TestValidator.equals(
    "reply comment has valid author",
    typeof replyComment.author.id,
    "string",
  );
  TestValidator.predicate(
    "reply comment status is published",
    replyComment.status === "published",
  );
  TestValidator.predicate(
    "reply comment has content",
    replyComment.content.length > 0,
  );
}
