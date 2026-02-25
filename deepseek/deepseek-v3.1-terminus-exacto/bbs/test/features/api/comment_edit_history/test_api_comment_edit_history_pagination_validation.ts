import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentEditHistory";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_edit_history_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user session
  const userConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.user.join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create an article to comment on using the user's connection
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create the initial comment
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Perform many edits (25 edits) to generate substantial edit history
  const totalEdits = 25;
  const editContents = ArrayUtil.repeat(totalEdits, (index) =>
    RandomGenerator.paragraph({ sentences: 3 }),
  );
  for (let i = 0; i < totalEdits; i++) {
    const updatedComment =
      await api.functional.discussionBoard.user.articles.comments.update(
        userConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: editContents[i],
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    typia.assert(updatedComment);
  }
  // Test pagination with different limits
  const limits = [5, 10, 100] as const;
  for (const limit of limits) {
    const firstPage =
      await api.functional.discussionBoard.user.comments.edit_histories.index(
        userConnection,
        {
          commentId: comment.id,
          body: {
            page: 1,
            limit: limit satisfies number as number,
          } satisfies IDiscussionBoardCommentEditHistory.IRequest,
        },
      );
    typia.assert(firstPage);
    // Validate pagination metadata
    TestValidator.equals(
      `limit ${limit}: first page metadata`,
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      `limit ${limit}: limit matches request`,
      firstPage.pagination.limit,
      limit,
    );
    TestValidator.equals(
      `limit ${limit}: total records`,
      firstPage.pagination.records,
      totalEdits,
    );
    TestValidator.predicate(
      `limit ${limit}: total pages calculated correctly`,
      () =>
        firstPage.pagination.pages ===
        Math.ceil(totalEdits / firstPage.pagination.limit),
    );
    // Test second page if exists
    if (firstPage.pagination.pages >= 2) {
      const secondPage =
        await api.functional.discussionBoard.user.comments.edit_histories.index(
          userConnection,
          {
            commentId: comment.id,
            body: {
              page: 2,
              limit: limit satisfies number as number,
            } satisfies IDiscussionBoardCommentEditHistory.IRequest,
          },
        );
      typia.assert(secondPage);
      TestValidator.equals(
        `limit ${limit}: second page current`,
        secondPage.pagination.current,
        2,
      );
    }
    // Test last page
    const lastPage =
      await api.functional.discussionBoard.user.comments.edit_histories.index(
        userConnection,
        {
          commentId: comment.id,
          body: {
            page: firstPage.pagination.pages,
            limit: limit satisfies number as number,
          } satisfies IDiscussionBoardCommentEditHistory.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      `limit ${limit}: last page current`,
      lastPage.pagination.current,
      firstPage.pagination.pages,
    );
    // Verify completeness: collect all edit sequences across pages and ensure they are unique and cover 1..totalEdits
    const allEditSequences: number[] = [];
    for (let pageNum = 1; pageNum <= firstPage.pagination.pages; pageNum++) {
      const page =
        await api.functional.discussionBoard.user.comments.edit_histories.index(
          userConnection,
          {
            commentId: comment.id,
            body: {
              page: pageNum,
              limit: limit satisfies number as number,
            } satisfies IDiscussionBoardCommentEditHistory.IRequest,
          },
        );
      typia.assert(page);
      page.data.forEach((history) =>
        allEditSequences.push(history.edit_sequence),
      );
    }
    // All edit sequences should be unique and cover all edits
    TestValidator.equals(
      `limit ${limit}: total collected records`,
      allEditSequences.length,
      totalEdits,
    );
    TestValidator.predicate(
      `limit ${limit}: edit sequences are unique`,
      () => new Set(allEditSequences).size === totalEdits,
    );
    TestValidator.predicate(
      `limit ${limit}: edit sequences cover 1..${totalEdits}`,
      () => {
        const sorted = [...allEditSequences].sort((a, b) => a - b);
        return (
          sorted.length === totalEdits &&
          sorted.every((seq, idx) => seq === idx + 1)
        );
      },
    );
  }
  // Test edge cases
  // Test page=0 (should return first page based on IRequest definition with min 1)
  // Actually, page with minimum 1, but we test with page=0 to see how API handles it
  // Using the utility function for error testing
  await TestValidator.error("page=0 should throw error", async () => {
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        commentId: comment.id,
        body: {
          page: 0 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  });
  // Test limit exceeding maximum (100 is max per IRequest)
  await TestValidator.error("limit=101 should throw error", async () => {
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 101 satisfies number as number,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  });
  // Test search filter that yields no results
  const noResults =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        commentId: comment.id,
        body: {
          search: "NONEXISTENT_SEARCH_TERM_XYZ123",
          page: 1,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(noResults);
  TestValidator.equals(
    "search with no results returns empty data",
    noResults.data.length,
    0,
  );
  TestValidator.equals(
    "search with no results records count",
    noResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "search with no results total pages",
    noResults.pagination.pages,
    0,
  );
}
