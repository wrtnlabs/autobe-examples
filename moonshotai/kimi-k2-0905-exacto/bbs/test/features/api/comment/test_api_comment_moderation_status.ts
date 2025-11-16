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
 * Test comment creation with proper moderation status tracking.
 *
 * This test validates that new comments receive appropriate moderation status
 * ('pending' for initial creation) and that the system properly handles comment
 * approval workflow for community content standards compliance within economic
 * discussions.
 *
 * Test steps:
 *
 * 1. Register a new member account for comment creation
 * 2. Create an economic discussion article to receive moderated comments
 * 3. Add a comment to the article and verify moderation status assignment
 * 4. Validate comment structure includes proper moderation fields
 * 5. Verify comment is properly associated with article and member
 */
export async function test_api_comment_moderation_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account for comment creation
  const email = `${RandomGenerator.alphabets(8)}@${RandomGenerator.pick(["gmail.com", "yahoo.com", "outlook.com"] as const)}`;
  const memberData = {
    username: RandomGenerator.name(),
    email: email,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create economic discussion article to receive comments
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    category_ids: [categoryId],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Create comment and verify moderation status
  const commentContent = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 8,
  });
  const commentData = {
    article_id: article.id,
    content: commentContent,
  } satisfies IEconomicDiscussionComment.ICreate;

  const comment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Step 4: Validate comment moderation status and structure
  TestValidator.equals(
    "comment has pending moderation status",
    comment.status,
    "pending",
  );
  TestValidator.equals(
    "comment content matches input",
    comment.content,
    commentData.content,
  );
  TestValidator.equals(
    "comment linked to correct article",
    comment.economic_discussion_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment linked to correct member",
    comment.economic_discussion_member_id,
    member.member.id,
  );

  // Step 5: Verify comment contains required moderation fields
  TestValidator.predicate("comment has valid ID format", comment.id.length > 0);
  TestValidator.predicate(
    "comment has creation timestamp",
    comment.created_at.length > 0,
  );
  TestValidator.predicate(
    "comment has update timestamp",
    comment.updated_at.length > 0,
  );
  TestValidator.equals(
    "comment has no parent (direct article comment)",
    comment.parent_id,
    null,
  );
}
