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
 * Test adding comments to articles created by other members. This scenario
 * ensures cross-member comment functionality works correctly, validating that
 * community members can engage with each other's content through comments.
 * Tests verify proper comment attribution, article ownership boundaries, and
 * community discussion enablement.
 *
 * 1. Create first member account to create test article
 * 2. Create article by first member for second member to comment on
 * 3. Create second member account to test commenting on another member's article
 * 4. Add comment to the article by different member
 * 5. Verify comment attribution and relationships
 */
export async function test_api_comment_creation_member_other_article(
  connection: api.IConnection,
) {
  // Create first member (article author) through authentication
  const authorMemberData: IEconomicDiscussionMember.ICreate = {
    username: RandomGenerator.alphaNumeric(10)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, ""),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  };

  await api.functional.auth.member.join(connection, {
    body: authorMemberData,
  });

  // Create article by first member
  const articleData: IEconomicDiscussionArticle.ICreate = {
    title: RandomGenerator.name(3),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    category_ids: [typia.random<string & tags.Format<"uuid">>()],
  };

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Create second member (commenter) through authentication
  const commenterMemberData: IEconomicDiscussionMember.ICreate = {
    username: RandomGenerator.alphaNumeric(10)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, ""),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  };

  const commenterAuth = await api.functional.auth.member.join(connection, {
    body: commenterMemberData,
  });
  typia.assert(commenterAuth);

  // Add comment to the article by different member
  const commentData: IEconomicDiscussionComment.ICreate = {
    article_id: article.id,
    content: RandomGenerator.paragraph({ sentences: 10 }),
  };

  const comment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Verify comment attribution and relationships
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
    "comment attributed to correct member",
    comment.economic_discussion_member_id,
    commenterAuth.member.id,
  );
  TestValidator.predicate(
    "comment content meets minimum length requirement",
    comment.content.length >= 10,
  );
  TestValidator.predicate(
    "comment has valid status",
    ["pending", "approved", "rejected"].includes(comment.status),
  );
}
