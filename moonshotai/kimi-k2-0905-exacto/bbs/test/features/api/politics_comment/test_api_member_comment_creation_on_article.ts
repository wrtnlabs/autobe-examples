import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import type { IPoliticsBbsArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticleSnapshot";
import type { IPoliticsBbsAttachmentOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfMember";
import type { IPoliticsBbsAttachmentOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfModerator";
import type { IPoliticsBbsAttachmentOfVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfVisitor";
import type { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import type { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import type { IPoliticsBbsFileAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsFileAttachment";
import type { IPoliticsBbsImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsImageAttachment";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";
import type { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";
import type { IPoliticsBbsVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitor";

/**
 * Test member comment creation on politicsBBS article with complete workflow
 * validation.
 *
 * This comprehensive test validates the entire comment creation process:
 *
 * 1. Member registration for authentication
 * 2. Category creation for article organization
 * 3. Article creation as comment target
 * 4. Comment creation with threading support
 * 5. Content validation and business rule enforcement
 * 6. Proper association with article and member
 *
 * The test ensures comments support meaningful dialogue on political
 * discussions while maintaining proper content validation, threading support,
 * and audit trails.
 */
export async function test_api_member_comment_creation_on_article(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account for authentication
  const memberCredentials = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123",
    href: "https://politicsbbs.example.com/register",
    referrer: "https://politicsbbs.example.com/landing",
  } satisfies IPoliticsBbsMember.IJoin;

  const member = await api.functional.auth.members.join(connection, {
    body: memberCredentials,
  });
  typia.assert(member);

  TestValidator.equals(
    "member has correct role assignment",
    member.role,
    "member",
  );
  TestValidator.predicate(
    "member has valid JWT token",
    member.token.access.length > 0,
  );

  // Step 2: Create political discussion category
  const categoryData = {
    code: RandomGenerator.alphabets(10),
    name: "Economic Policy Analysis",
    description:
      "In-depth discussions about economic policies, market trends, and financial regulations affecting our society.",
    sequence: 1,
    primary: true,
    required: true,
    multiplicative: false,
    color: "#1E88E5",
    icon: "fas fa-chart-line",
  } satisfies IPoliticsBbsCategory.ICreate;

  const category = await api.functional.politicsBbs.moderator.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category code is unique",
    category.code,
    categoryData.code,
  );
  TestValidator.predicate("category is primary", category.primary === true);

  // Step 3: Create article for commenting
  const articleData = {
    politics_bbs_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 15,
      sentenceMax: 25,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IPoliticsBbsArticle.ICreate;

  const article = await api.functional.politicsBbs.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  TestValidator.equals(
    "article category matches",
    article.politics_bbs_category_id,
    category.id,
  );
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleData.title,
  );
  TestValidator.predicate(
    "article content meets minimum length",
    article.content.length >= 50,
  );
  TestValidator.equals(
    "article state is pending for moderation",
    article.state,
    "pending",
  );

  // Step 4: Create comment on the article with meaningful political discussion
  const commentData = {
    content:
      "This is a thoughtful analysis of the economic policy implications. The proposed changes would significantly impact middle-class families through increased tax burdens while potentially reducing investment incentives. Historical data suggests similar policies in European markets led to mixed outcomes. Key considerations should include inflation rates, employment statistics, and consumer spending patterns before implementing such substantial regulatory modifications.",
    href: `https://politicsbbs.example.com/articles/${article.id}`,
    referrer: `https://politicsbbs.example.com/categories/${category.code}`,
  } satisfies IPoliticsBbsComment.ICreate;

  const comment =
    await api.functional.politicsBbs.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Step 5: Validate comment properties and relationships
  TestValidator.equals(
    "comment article association correct",
    comment.politics_bbs_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment content matches input",
    comment.content,
    commentData.content,
  );
  TestValidator.predicate(
    "comment content meets minimum length",
    comment.content.length >= 20,
  );
  TestValidator.predicate(
    "comment content within maximum limit",
    comment.content.length <= 1000,
  );
  TestValidator.equals("comment depth is 0 for top-level", comment.depth, 0);
  TestValidator.equals(
    "comment status is pending for moderation",
    comment.status,
    "pending",
  );
  TestValidator.equals(
    "comment actor type is member",
    comment.actor_type,
    "member",
  );
  TestValidator.predicate(
    "comment has valid created timestamp",
    comment.created_at.length > 0,
  );
  TestValidator.predicate(
    "comment has valid updated timestamp",
    comment.updated_at.length > 0,
  );
  TestValidator.predicate(
    "comment deleted_at is null for new comments",
    comment.deleted_at === null,
  );

  // Step 6: Test comment with parent_id for threading support
  const replyData = {
    content:
      "Excellent point about the historical data from European markets. I'd like to add that Nordic countries implemented similar policies with some success, particularly in Denmark and Sweden where social safety nets are more robust. The key difference was the gradual implementation timeline over 5-7 years rather than the proposed 2-year period in our current discussion.",
    parent_id: comment.id,
    href: `https://politicsbbs.example.com/articles/${article.id}`,
    referrer: `https://politicsbbs.example.com/articles/${article.id}#comments`,
  } satisfies IPoliticsBbsComment.ICreate;

  const reply =
    await api.functional.politicsBbs.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: replyData,
      },
    );
  typia.assert(reply);

  TestValidator.equals(
    "reply parent matches original comment",
    reply.parent_id,
    comment.id,
  );
  TestValidator.equals("reply depth is 1 for nested comment", reply.depth, 1);
  TestValidator.equals(
    "reply article association correct",
    reply.politics_bbs_article_id,
    article.id,
  );
  TestValidator.equals(
    "reply actor type is member",
    reply.actor_type,
    "member",
  );

  // Step 7: Test content validation with boundary conditions
  const shortCommentData = {
    content: "This policy needs more analysis",
    href: `https://politicsbbs.example.com/articles/${article.id}`,
    referrer: `https://politicsbbs.example.com/articles/${article.id}#discussion`,
  } satisfies IPoliticsBbsComment.ICreate;

  const shortComment =
    await api.functional.politicsBbs.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: shortCommentData,
      },
    );
  typia.assert(shortComment);

  TestValidator.predicate(
    "short comment content meets minimum length",
    shortComment.content.length >= 20,
  );
  TestValidator.equals(
    "short comment content matches input data",
    shortComment.content,
    shortCommentData.content,
  );

  // Step 8: Validate error case for invalid comment length (too short)
  await TestValidator.error(
    "comment content too short should fail",
    async () => {
      const invalidCommentData = {
        content: "Too short", // 9 characters - below minimum 20
        href: `https://politicsbbs.example.com/articles/${article.id}`,
        referrer: `https://politicsbbs.example.com/discussion`,
      } satisfies IPoliticsBbsComment.ICreate;

      await api.functional.politicsBbs.member.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: invalidCommentData,
        },
      );
    },
  );
}
