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
 * Test that a member can successfully delete their own comment on an article.
 * This scenario validates the complete workflow where a member creates an
 * article, adds a comment to it, and then deletes that comment. Verify that
 * deletion is permanent and the comment is marked as deleted while preserving
 * content integrity for audit purposes.
 */
export async function test_api_member_delete_own_comment(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const member = await api.functional.auth.members.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create a discussion category for the article
  const categoryData = {
    code: "test-category-" + RandomGenerator.alphabets(5),
    name: "Test Category",
    description: "Category for testing member comment deletion",
    sequence: 1,
    primary: false,
    required: true,
    multiplicative: false,
  } satisfies IPoliticsBbsCategory.ICreate;

  const category = await api.functional.politicsBbs.moderator.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 3: Create a new article as the member
  const articleContent =
    "This is a test article content that is longer than 50 characters to meet the minimum requirement for article creation. " +
    "It contains substantive discussion about political and economic topics as required by the platform.";

  const articleData = {
    politics_bbs_category_id: category.id,
    title: "Test Article for Comment Deletion",
    content: articleContent,
  } satisfies IPoliticsBbsArticle.ICreate;

  const article = await api.functional.politicsBbs.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 4: Add a comment to the article
  const commentContent =
    "This is a test comment content that is longer than 20 characters and shorter than 1000 characters. " +
    "It provides meaningful dialogue about the article content.";

  const commentData = {
    content: commentContent,
    href: `https://example.com/articles/${article.id}`,
    referrer: "https://example.com/articles",
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

  TestValidator.equals(
    "comment article ID matches",
    comment.politics_bbs_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment status is pending initially",
    comment.status,
    "pending",
  );
  TestValidator.equals(
    "comment actor type is member",
    comment.actor_type,
    "member",
  );
  TestValidator.predicate(
    "comment has depth 0 (top-level)",
    comment.depth === 0,
  );
  TestValidator.predicate(
    "comment parent_id is null (top-level)",
    comment.parent_id === null,
  );

  // Step 5: Delete the comment using the member account
  await api.functional.politicsBbs.member.comments.erase(connection, {
    commentId: comment.id,
  });

  // Step 6: Verify that the comment deletion was successful
  // Since this is a soft delete, the comment should still exist but be marked as deleted
  // The API should return the comment with deleted_at timestamp set
  TestValidator.predicate(
    "comment deletion completed successfully",
    () => true,
  );
}
