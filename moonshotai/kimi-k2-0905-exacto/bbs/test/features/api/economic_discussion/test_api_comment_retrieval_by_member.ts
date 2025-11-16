import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test that authenticated members can retrieve specific comments from economic
 * discussion articles.
 *
 * This test validates the complete comment retrieval workflow in the economic
 * discussion platform. It ensures that authenticated members can successfully
 * retrieve specific comments they've created on articles, verifying comment
 * visibility, content accuracy, author attribution, and proper relationship
 * mapping between articles and comments.
 *
 * Test workflow:
 *
 * 1. Register new member account for authentication
 * 2. Create economic discussion article as parent content
 * 3. Add comment to the article
 * 4. Retrieve the specific comment by ID
 * 5. Validate comment data integrity and relationships
 */
export async function test_api_comment_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account for authentication
  const memberRegistration = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberRegistration,
  });
  typia.assert(memberAuth);

  // Step 2: Create economic discussion article
  const articleCategories = [typia.random<string & tags.Format<"uuid">>()];
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    category_ids: articleCategories,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const createdArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 3: Create comment on the article
  const commentContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const commentData = {
    article_id: createdArticle.id,
    content: commentContent,
  } satisfies IEconomicDiscussionComment.ICreate;

  const createdComment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: commentData,
      },
    );
  typia.assert(createdComment);

  // Step 4: Retrieve the specific comment
  const retrievedComment =
    await api.functional.economicDiscussion.member.articles.comments.at(
      connection,
      {
        articleId: createdArticle.id,
        commentId: createdComment.id,
      },
    );
  typia.assert(retrievedComment);

  // Step 5: Validate comment retrieval
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment article ID matches",
    retrievedComment.economic_discussion_article_id,
    createdArticle.id,
  );
  TestValidator.equals(
    "comment member ID matches",
    retrievedComment.economic_discussion_member_id,
    memberAuth.member.id,
  );
  TestValidator.equals(
    "comment ID matches",
    retrievedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "comment status matches",
    retrievedComment.status,
    "pending",
  );

  // Validate timestamps are present
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedComment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedComment.updated_at.length > 0,
  );

  // Validate content length constraints
  TestValidator.predicate(
    "content meets minimum length",
    retrievedComment.content.length >= 10,
  );
  TestValidator.predicate(
    "content meets maximum length",
    retrievedComment.content.length <= 1000,
  );
}
