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
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test moderator deletion of inappropriate comments from economic discussion
 * articles.
 *
 * This test validates the complete workflow for moderators to remove
 * inappropriate comments while preserving discussion thread integrity through
 * soft deletion. The scenario involves:
 *
 * 1. Creating a member account to author content
 * 2. Creating an economic discussion article for commenting
 * 3. Adding an inappropriate comment that violates community guidelines
 * 4. Creating a moderator account with deletion privileges
 * 5. Switching to moderator authentication to perform deletion
 * 6. Validating that the comment is soft-deleted (marked with deleted_at
 *    timestamp)
 * 7. Confirming that referential integrity is maintained in the database
 *
 * The test ensures moderators can effectively manage content quality while
 * maintaining the structural integrity of discussion threads for audit and
 * potential restoration.
 */
export async function test_api_moderator_delete_inappropriate_comment(
  connection: api.IConnection,
) {
  // Step 1: Create member account to author content
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePassword123!",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create an economic discussion article
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({ paragraphs: 2 });
  const categories = ["economics", "policy", "debate"] as const;
  const categoryCode = RandomGenerator.pick(categories);

  const categoryData = {
    id: typia.random<string & tags.Format<"uuid">>(),
    code: categoryCode,
    name: categoryCode.charAt(0).toUpperCase() + categoryCode.slice(1),
    display_order: 1,
    is_active: true,
    article_count: 0,
  } satisfies IEconomicDiscussionCategories.ISummary;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_ids: [categoryData.id],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Add inappropriate comment that violates community guidelines
  const inappropriateContent =
    "This article is completely wrong and the author is an idiot who doesn't understand basic economics!";
  const comment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          article_id: article.id,
          content: inappropriateContent,
        } satisfies IEconomicDiscussionComment.ICreate,
      },
    );
  typia.assert(comment);

  // Validate comment was created successfully
  TestValidator.equals(
    "comment content matches created content",
    comment.content,
    inappropriateContent,
  );
  TestValidator.equals(
    "comment status is approved initially",
    comment.status,
    "approved",
  );
  TestValidator.predicate(
    "comment has no deleted_at timestamp initially",
    comment.deleted_at === undefined,
  );

  // Step 4: Create moderator account
  const moderatorUsername = RandomGenerator.name();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "ModeratorPassword123!",
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 5: Switch to moderator authentication and delete the inappropriate comment
  await api.functional.auth.moderator.login(connection, {
    body: {
      username: moderatorUsername,
      password: "ModeratorPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IEconomicDiscussionModerator.ILogin,
  });

  // Step 6: Delete the inappropriate comment as moderator
  const deletedComment =
    await api.functional.economicDiscussion.moderator.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(deletedComment);

  // Step 7: Validate soft deletion maintained referential integrity
  TestValidator.equals(
    "deleted comment ID matches original",
    deletedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "deleted comment article ID matches",
    deletedComment.economic_discussion_article_id,
    article.id,
  );
  TestValidator.equals(
    "deleted comment member ID matches",
    deletedComment.economic_discussion_member_id,
    member.member.id,
  );
  TestValidator.equals(
    "deleted comment content unchanged",
    deletedComment.content,
    inappropriateContent,
  );
  TestValidator.notEquals(
    "deleted comment has deleted_at timestamp",
    deletedComment.deleted_at,
    undefined,
  );
  TestValidator.notEquals(
    "deleted comment has deleted_at timestamp",
    deletedComment.deleted_at,
    null,
  );

  // Verify the deleted_at is a valid ISO date-time string
  typia.assert<string & tags.Format<"date-time">>(deletedComment.deleted_at!);
}
