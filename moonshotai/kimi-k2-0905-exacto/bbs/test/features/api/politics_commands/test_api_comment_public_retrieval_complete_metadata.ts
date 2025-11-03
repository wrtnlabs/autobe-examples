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
 * Test public access retrieval of individual comment metadata including
 * content, moderation status, creation timestamp, nesting level, and owner type
 * information.
 *
 * This comprehensive test validates that public comment retrieval endpoint
 * provides complete metadata without authentication requirements. It
 * specifically tests:
 *
 * 1. Comment content and formatting validation
 * 2. Moderation status tracking (pending/approved/rejected/flagged)
 * 3. Creation and update timestamp accuracy
 * 4. Threading structure support (parent_id, depth, nesting levels)
 * 5. Owner type identification (visitor/member/moderator)
 * 6. Anonymous accessibility without authentication
 *
 * The test follows the typical politicsBBS workflow where member creates
 * category, article, and comment, then verifies public retrieval returns all
 * expected metadata fields while maintaining security boundaries.
 *
 * Expected behavior:
 *
 * - Comment retrieval should work without authentication
 * - All comment metadata fields should be populated correctly
 * - Parent-child relationships should be properly maintained
 * - Nesting depth should respect the 3-level limit
 * - Owner type should accurately reflect the creator profile
 * - Content should retain formatting and character limits
 */
export async function test_api_comment_public_retrieval_complete_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account for test context
  const memberJoinData = {
    username: RandomGenerator.name() + "-" + RandomGenerator.alphaNumeric(5),
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password: "TestUser@123",
    href: "https://example.com/register",
    referrer: "https://example.com/about",
  } satisfies IPoliticsBbsMember.IJoin;

  const member = await api.functional.auth.members.join(connection, {
    body: memberJoinData,
  });
  typia.assert(member);

  TestValidator.predicate(
    "member should have JWT token",
    member.token.access.length > 0,
  );
  TestValidator.equals("member role should be member", member.role, "member");

  // Step 2: Create test category for article organization
  const categoryData = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    sequence: 1,
    primary: true,
    required: false,
    multiplicative: false,
  } satisfies IPoliticsBbsCategory.ICreate;

  const category = await api.functional.politicsBbs.moderator.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  TestValidator.equals(
    "category name matches",
    category.name,
    categoryData.name,
  );

  // Step 3: Create article in the category to serve as comment context
  const articleData = {
    politics_bbs_category_id: category.id,
    title:
      RandomGenerator.name(1) +
      " " +
      RandomGenerator.name(1) +
      " " +
      RandomGenerator.name(1),
    content: RandomGenerator.content({
      paragraphs: 5,
      sentenceMin: 15,
      sentenceMax: 25,
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
    "article creator should be the member",
    article.politics_bbs_creator_id,
    member.id,
  );
  TestValidator.predicate(
    "article should have valid state",
    article.state.length > 0,
  );

  // Step 4: Add comment to the article using member account
  const commentData = {
    content: RandomGenerator.paragraph({ sentences: 10 }),
    href: `https://test.com/article/${article.id}`,
    referrer: `https://test.com/category/${category.code}`,
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

  TestValidator.predicate(
    "comment content matches expected",
    comment.content === commentData.content,
  );
  TestValidator.equals(
    "comment article ID matches",
    comment.politics_bbs_article_id,
    article.id,
  );
  TestValidator.predicate(
    "comment has valid depth",
    comment.depth >= 0 && comment.depth <= 2,
  );

  // Step 5: Test public comment retrieval without authentication
  const retrievedComment = await api.functional.politicsBbs.comments.at(
    connection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(retrievedComment);

  // Validate complete comment metadata structure
  TestValidator.equals("comment ID matches", retrievedComment.id, comment.id);
  TestValidator.equals(
    "article ID matches",
    retrievedComment.politics_bbs_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    comment.content,
  );
  TestValidator.predicate(
    "comment has valid moderation status",
    ["pending", "approved", "rejected", "flagged"].includes(
      retrievedComment.status,
    ),
  );

  // Validate threading metadata
  TestValidator.equals(
    "parent_id consistency",
    retrievedComment.parent_id,
    comment.parent_id,
  );
  TestValidator.equals(
    "depth consistency",
    retrievedComment.depth,
    comment.depth,
  );
  TestValidator.predicate(
    "depth is within valid range",
    retrievedComment.depth >= 0 && retrievedComment.depth <= 2,
  );

  // Validate timestamps
  TestValidator.predicate(
    "comment has creation timestamp",
    retrievedComment.created_at.length > 0,
  );
  TestValidator.predicate(
    "comment has update timestamp",
    retrievedComment.updated_at.length > 0,
  );
  TestValidator.predicate(
    "created_at is a valid ISO datetime",
    /^\d{4}-.*T\d{2}:\d{2}:\d{2}/.test(retrievedComment.created_at),
  );

  // Validate actor type and metadata
  TestValidator.predicate(
    "actor_type is valid",
    ["visitor", "member", "moderator"].includes(retrievedComment.actor_type),
  );
  TestValidator.equals(
    "actor_type is member",
    retrievedComment.actor_type,
    "member",
  );

  // Validate content constraints
  TestValidator.predicate(
    "content length within bounds",
    retrievedComment.content.length >= 20 &&
      retrievedComment.content.length <= 1000,
  );

  // Test retrieval works without authentication by creating fresh connection
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  const publicRetrieved = await api.functional.politicsBbs.comments.at(
    unauthenticatedConn,
    {
      commentId: comment.id,
    },
  );
  typia.assert(publicRetrieved);

  TestValidator.equals(
    "public retrieval returns same data",
    publicRetrieved.id,
    comment.id,
  );
  TestValidator.equals(
    "public retrieval same content",
    publicRetrieved.content,
    comment.content,
  );
}
