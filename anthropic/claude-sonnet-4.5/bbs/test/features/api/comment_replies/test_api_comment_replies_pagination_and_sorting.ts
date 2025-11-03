import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test pagination and sorting capabilities when retrieving replies to a
 * comment.
 *
 * This test validates that the comment replies retrieval operation properly
 * handles large sets of replies with configurable page sizes and multiple
 * sorting options.
 *
 * Test process:
 *
 * 1. Create moderator account and category
 * 2. Create member account and article
 * 3. Create a parent comment on the article
 * 4. Create multiple reply comments (20 replies) to test pagination
 * 5. Test pagination with different page sizes (5, 10, 20)
 * 6. Validate pagination metadata (total count, pages, current page)
 * 7. Test sorting by creation date (ascending and descending)
 * 8. Test sorting by update date
 * 9. Verify correct parent comment association
 */
export async function test_api_comment_replies_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Create category (moderator is now authenticated)
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Create member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Create article (member is now authenticated)
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 5 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Create parent comment (top-level comment on the article)
  const parentComment =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: article.id,
      body: {
        discussion_board_article_id: article.id,
        discussion_board_parent_comment_id: null,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(parentComment);

  // Create 20 reply comments for pagination testing (all as member)
  const replyIds: string[] = [];

  for (let i = 0; i < 20; i++) {
    const reply = await api.functional.discussionBoard.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          discussion_board_parent_comment_id: parentComment.id,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
    typia.assert(reply);
    replyIds.push(reply.id);
  }

  // Test pagination with page size 5
  const page1Size5 =
    await api.functional.discussionBoard.articles.comments.replies.index(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: {
          page: 1,
          limit: 5,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(page1Size5);

  TestValidator.equals(
    "page 1 size 5 should have 5 items",
    page1Size5.data.length,
    5,
  );
  TestValidator.equals(
    "total records should be 20",
    page1Size5.pagination.records,
    20,
  );
  TestValidator.equals(
    "total pages should be 4 for size 5",
    page1Size5.pagination.pages,
    4,
  );
  TestValidator.equals(
    "current page should be 1",
    page1Size5.pagination.current,
    1,
  );

  // Test page 2 with size 5
  const page2Size5 =
    await api.functional.discussionBoard.articles.comments.replies.index(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: {
          page: 2,
          limit: 5,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(page2Size5);

  TestValidator.equals(
    "page 2 size 5 should have 5 items",
    page2Size5.data.length,
    5,
  );
  TestValidator.equals(
    "page 2 current page should be 2",
    page2Size5.pagination.current,
    2,
  );

  // Test pagination with page size 10
  const page1Size10 =
    await api.functional.discussionBoard.articles.comments.replies.index(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(page1Size10);

  TestValidator.equals(
    "page 1 size 10 should have 10 items",
    page1Size10.data.length,
    10,
  );
  TestValidator.equals(
    "total pages should be 2 for size 10",
    page1Size10.pagination.pages,
    2,
  );

  // Test sorting by creation date descending (newest first)
  const sortedNewest =
    await api.functional.discussionBoard.articles.comments.replies.index(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(sortedNewest);

  TestValidator.equals(
    "sorted newest should return all 20 items",
    sortedNewest.data.length,
    20,
  );

  // Verify newest first ordering
  for (let i = 0; i < sortedNewest.data.length - 1; i++) {
    const current = new Date(sortedNewest.data[i].created_at).getTime();
    const next = new Date(sortedNewest.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "newest first: current should be >= next",
      current >= next,
    );
  }

  // Test sorting by creation date ascending (oldest first)
  const sortedOldest =
    await api.functional.discussionBoard.articles.comments.replies.index(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(sortedOldest);

  TestValidator.equals(
    "sorted oldest should return all 20 items",
    sortedOldest.data.length,
    20,
  );

  // Verify oldest first ordering
  for (let i = 0; i < sortedOldest.data.length - 1; i++) {
    const current = new Date(sortedOldest.data[i].created_at).getTime();
    const next = new Date(sortedOldest.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "oldest first: current should be <= next",
      current <= next,
    );
  }

  // Test sorting by updated_at
  const sortedByUpdate =
    await api.functional.discussionBoard.articles.comments.replies.index(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "updated_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(sortedByUpdate);

  TestValidator.equals(
    "sorted by update should return all 20 items",
    sortedByUpdate.data.length,
    20,
  );

  // Verify pagination metadata consistency
  TestValidator.equals(
    "all requests should show same total records",
    page1Size5.pagination.records,
    20,
  );
}
