import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate that the deleted_at field is correctly included in comment retrieval
 * responses.
 *
 * This test validates soft deletion support by ensuring that the deleted_at
 * field is present in comment responses and properly reflects the active state
 * (null value) for newly created comments. This establishes the foundation for
 * future moderation features that will utilize soft deletion.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a member account
 * 2. Create a discussion board article for comment context
 * 3. Post a comment on the article
 * 4. Retrieve the comment via GET endpoint
 * 5. Validate deleted_at field presence and null value
 * 6. Confirm schema compliance with nullable deleted_at field
 */
export async function test_api_comment_retrieval_deleted_at_field(
  connection: api.IConnection,
) {
  // Step 1: Create member account for comment creation
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create article for comment context
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Post a comment on the article
  const commentData = {
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const createdComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(createdComment);

  // Step 4: Retrieve the created comment
  const retrievedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.at(connection, {
      articleId: article.id,
      commentId: createdComment.id,
    });
  typia.assert(retrievedComment);

  // Step 5: Validate deleted_at field is present and null for active comments
  TestValidator.predicate(
    "deleted_at field must be present in response",
    "deleted_at" in retrievedComment,
  );

  // Step 6: Validate deleted_at is null for active comment
  // Since deleted_at is optional (can be undefined), we handle it properly
  if (
    retrievedComment.deleted_at !== null &&
    retrievedComment.deleted_at !== undefined
  ) {
    throw new Error("deleted_at should be null for active comments");
  }

  TestValidator.equals(
    "deleted_at should be null for active comments",
    retrievedComment.deleted_at ?? null,
    null,
  );

  // Step 7: Validate comment IDs match
  TestValidator.equals(
    "retrieved comment ID matches created comment ID",
    retrievedComment.id,
    createdComment.id,
  );

  // Step 8: Validate comment content matches
  TestValidator.equals(
    "retrieved comment content matches original",
    retrievedComment.content,
    commentData.content,
  );
}
