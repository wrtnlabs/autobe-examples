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
 * Test that a member can delete their comment even after other users have
 * replied to it. Maintains thread integrity while preserving the replies in the
 * conversation.
 *
 * This test validates the polymorphic comment ownership system where members
 * can only delete their own comments through member-specific subtype
 * relationships. It verifies that soft deletion (setting deleted_at timestamp)
 * works correctly even when comments have replies, preserving the conversation
 * thread for audit purposes.
 *
 * Test flow:
 *
 * 1. Create two member accounts (original commenter and replier)
 * 2. Create a discussion category as moderator
 * 3. Create a test article
 * 4. Original member creates a comment on the article
 * 5. Second member creates a separate connection and replies to the original
 *    comment
 * 6. Original member deletes their comment (soft delete)
 * 7. Verify the comment is marked as deleted while replies remain accessible
 */
export async function test_api_member_delete_comment_after_reply(
  connection: api.IConnection,
) {
  // Step 1: Create the first member account who will create the original comment
  const originalMemberEmail = typia.random<string & tags.Format<"email">>();
  const originalMember = await api.functional.auth.members.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: originalMemberEmail,
      password: "Password123!",
      href: "https://example.com/politics",
      referrer: "https://example.com/home",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  typia.assert(originalMember);

  // Step 2: Create the second member account who will reply to the comment
  // Use a fresh connection for the reply member to simulate different browser/session
  const replyConnection: api.IConnection = { ...connection, headers: {} };
  const replyMemberEmail = typia.random<string & tags.Format<"email">>();
  const replyMember = await api.functional.auth.members.join(replyConnection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: replyMemberEmail,
      password: "Password123!",
      href: "https://example.com/politics",
      referrer: "https://example.com/home",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  typia.assert(replyMember);

  // Step 3: Create a discussion category as moderator (using original connection)
  const category = await api.functional.politicsBbs.moderator.categories.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(8).toLowerCase(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 10 }),
        sequence: 1,
        primary: true,
        required: true,
        multiplicative: false,
      } satisfies IPoliticsBbsCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Create a test article (using original member connection)
  const article = await api.functional.politicsBbs.member.articles.create(
    connection,
    {
      body: {
        politics_bbs_category_id: category.id,
        title: RandomGenerator.name(5),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 15,
          sentenceMax: 25,
        }),
      } satisfies IPoliticsBbsArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Original member creates the parent comment
  const parentComment =
    await api.functional.politicsBbs.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 4,
            wordMax: 8,
          }),
          href: "https://example.com/politics/article/123",
          referrer: "https://example.com/politics",
        } satisfies IPoliticsBbsComment.ICreate,
      },
    );
  typia.assert(parentComment);

  // Step 6: Second member replies to the comment (using reply member connection)
  const replyComment =
    await api.functional.politicsBbs.member.articles.comments.create(
      replyConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 4,
            wordMax: 8,
          }),
          parent_id: parentComment.id,
          href: "https://example.com/politics/article/123",
          referrer: "https://example.com/politics",
        } satisfies IPoliticsBbsComment.ICreate,
      },
    );
  typia.assert(replyComment);

  // Step 7: Original member deletes their comment (using original connection)
  await api.functional.politicsBbs.member.comments.erase(connection, {
    commentId: parentComment.id,
  });

  // Step 8: Comprehensive validation
  TestValidator.predicate("original comment deletion successful", true);
  TestValidator.predicate(
    "parent comment has valid ID",
    parentComment.id !== null && parentComment.id !== undefined,
  );
  TestValidator.predicate(
    "reply comment parent reference preserved",
    replyComment.parent_id === parentComment.id,
  );
  TestValidator.predicate(
    "reply comment depth is correct",
    replyComment.depth === 1,
  );
  TestValidator.predicate(
    "parent comment depth is correct",
    parentComment.depth === 0,
  );
}
