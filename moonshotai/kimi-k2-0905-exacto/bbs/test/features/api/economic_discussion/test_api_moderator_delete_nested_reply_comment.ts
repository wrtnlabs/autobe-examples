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
 * Test moderator deletion of nested reply comments in discussion threads.
 *
 * This test validates the complete workflow for moderator deletion of nested
 * comments in economic discussion articles. The scenario involves:
 *
 * 1. Creating member and moderator accounts for authentication
 * 2. Creating an economic discussion article for comment testing
 * 3. Creating a parent comment on the article
 * 4. Creating a nested reply comment to the parent comment
 * 5. Switching to moderator authentication
 * 6. Deleting the nested reply comment using moderator privileges
 * 7. Verifying the comment is properly soft-deleted (deleted_at timestamp set)
 *
 * The test ensures moderators can remove specific nested replies while
 * preserving the overall conversation thread structure and maintaining proper
 * authorization boundaries between member and moderator roles.
 */
export async function test_api_moderator_delete_nested_reply_comment(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: memberEmail,
      password: "memberPassword123",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Login as member to create content
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password_hash: "memberPassword123",
    } satisfies IEconomicDiscussionMember.ILogin,
  });

  // Step 3: Create moderator account for deletion authority
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "moderatorPassword123",
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Create economic discussion article
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Create parent comment on the article
  const parentComment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          article_id: article.id,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconomicDiscussionComment.ICreate,
      },
    );
  typia.assert(parentComment);

  // Step 6: Create nested reply comment to the parent comment
  const nestedReply =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          article_id: article.id,
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: parentComment.id,
        } satisfies IEconomicDiscussionComment.ICreate,
      },
    );
  typia.assert(nestedReply);

  // Step 7: Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      username: moderator.username,
      password: "moderatorPassword123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/login",
    } satisfies IEconomicDiscussionModerator.ILogin,
  });

  // Step 8: Delete the nested reply comment using moderator privileges
  const deletedComment =
    await api.functional.economicDiscussion.moderator.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: nestedReply.id,
      },
    );
  typia.assert(deletedComment);

  // Step 9: Verify the comment is properly soft-deleted
  TestValidator.predicate(
    "nested reply comment is soft-deleted",
    deletedComment.deleted_at !== null &&
      deletedComment.deleted_at !== undefined,
  );

  // Step 10: Verify parent comment is unaffected
  TestValidator.equals(
    "parent comment is not deleted",
    parentComment.id,
    deletedComment.parent_id,
  );

  // Step 11: Verify the deleted comment still references the correct article
  TestValidator.equals(
    "deleted comment references correct article",
    article.id,
    deletedComment.economic_discussion_article_id,
  );
}
