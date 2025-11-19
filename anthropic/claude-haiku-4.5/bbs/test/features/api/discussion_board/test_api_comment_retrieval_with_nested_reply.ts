import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_comment_retrieval_with_nested_reply(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(8),
        password: "Test@1234",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create a moderator for article approval
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "Test@1234",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create an article as contributor
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    categoryId: typia.random<string & tags.Format<"uuid">>(),
    href: "http://localhost:3000/articles/create",
    referrer: "http://localhost:3000",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: articleData,
      },
    );
  typia.assert(article);

  // Step 4: Approve article as moderator
  const approvedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: article.id,
        body: {
          approvalNotes: "Approved for discussion",
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvedArticle);
  TestValidator.equals(
    "article status should be published",
    approvedArticle.status,
    "published",
  );

  // Step 5: Create parent comment on the article
  const parentCommentData = {
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const parentComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: parentCommentData,
      },
    );
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment should not have parent",
    parentComment.parentComment,
    null,
  );

  // Step 6: Create reply comment linking to parent comment
  const replyCommentData = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: parentComment.id,
  } satisfies IDiscussionBoardComment.ICreate;

  const replyComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: replyCommentData,
      },
    );
  typia.assert(replyComment);
  TestValidator.equals(
    "reply should have parent comment ID",
    replyComment.parentComment?.id,
    parentComment.id,
  );

  // Step 7: Retrieve the reply comment and verify parentComment reference
  const retrievedReplyComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.at(connection, {
      articleId: article.id,
      commentId: replyComment.id,
    });
  typia.assert(retrievedReplyComment);

  // Verify the parent comment reference is properly populated
  TestValidator.predicate(
    "retrieved reply should have parentComment object",
    retrievedReplyComment.parentComment !== null &&
      retrievedReplyComment.parentComment !== undefined,
  );

  if (retrievedReplyComment.parentComment) {
    TestValidator.equals(
      "parent comment ID should match original parent",
      retrievedReplyComment.parentComment.id,
      parentComment.id,
    );

    TestValidator.equals(
      "parent comment content should match",
      retrievedReplyComment.parentComment.content,
      parentComment.content,
    );
  }

  // Verify the reply comment properties
  TestValidator.equals(
    "retrieved comment ID should match",
    retrievedReplyComment.id,
    replyComment.id,
  );

  TestValidator.equals(
    "retrieved comment content should match",
    retrievedReplyComment.content,
    replyComment.content,
  );

  TestValidator.equals(
    "retrieved comment article ID should match",
    retrievedReplyComment.article.id,
    article.id,
  );
}
