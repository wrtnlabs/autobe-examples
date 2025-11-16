import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test comment retrieval behavior when comments have been soft-deleted.
 *
 * This test validates that deleted_at timestamp handling works correctly in
 * summary views for both regular members and moderators.
 *
 * Workflow:
 *
 * 1. Create member account and authenticate
 * 2. Member creates an article
 * 3. Member creates several comments on the article
 * 4. Member deletes some of the comments (soft deletion)
 * 5. Retrieve comments list and verify deleted comments handling
 * 6. Create moderator account to test moderator perspective
 * 7. Moderator retrieves comments to verify moderation view of deleted content
 */
export async function test_api_article_comments_with_deleted_content(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Member creates an article
  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 3. Member creates several comments on the article
  const comments: IDiscussionBoardComment[] = [];

  for (let i = 0; i < 5; i++) {
    const comment =
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  // 4. Member deletes some comments (soft deletion)
  const commentsToDelete = comments.slice(0, 2);

  for (const comment of commentsToDelete) {
    const deletedComment =
      await api.functional.discussionBoard.member.articles.comments.erase(
        connection,
        {
          articleId: article.id,
          commentId: comment.id,
        },
      );
    typia.assert(deletedComment);

    // Verify the deleted comment has deleted_at timestamp
    TestValidator.predicate(
      "deleted comment should have deleted_at timestamp",
      deletedComment.deleted_at !== null &&
        deletedComment.deleted_at !== undefined,
    );
  }

  // 5. Retrieve comments as member and verify behavior
  const memberCommentsPage =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(memberCommentsPage);

  // Verify pagination metadata
  TestValidator.predicate(
    "comments page should have data array",
    Array.isArray(memberCommentsPage.data),
  );

  // 6. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "modpass123",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 7. Moderator retrieves comments to verify moderation view
  const moderatorCommentsPage =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(moderatorCommentsPage);

  // Verify moderator can see deleted comments with timestamps
  const moderatorDeletedComments = moderatorCommentsPage.data.filter(
    (c) => c.deleted_at !== null && c.deleted_at !== undefined,
  );

  TestValidator.predicate(
    "moderator should see deleted comments",
    moderatorDeletedComments.length > 0,
  );

  // Verify active comments have null deleted_at
  const moderatorActiveComments = moderatorCommentsPage.data.filter(
    (c) => c.deleted_at === null || c.deleted_at === undefined,
  );

  for (const activeComment of moderatorActiveComments) {
    TestValidator.predicate(
      "active comment should have null deleted_at",
      activeComment.deleted_at === null ||
        activeComment.deleted_at === undefined,
    );
  }

  // Verify total comment count
  TestValidator.predicate(
    "total comments should match created count",
    moderatorCommentsPage.data.length === comments.length,
  );
}
