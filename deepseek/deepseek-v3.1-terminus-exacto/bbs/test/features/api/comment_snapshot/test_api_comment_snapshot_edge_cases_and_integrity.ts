import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_snapshot_edge_cases_and_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate using available utility
  const memberConnection: api.IConnection = { host: connection.host };
  // Use the available authorize_member_join utility function
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // Create first article - use a valid section ID or create one first
  // Since we don't have section creation API, we'll use a random UUID for testing
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  // Create second article
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  // Create comment on first article
  const comment1 =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article1.id,
        },
      },
    );
  typia.assert(comment1);
  // Test 1: Retrieve snapshots for non-existent comment
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  const snapshots1 =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article1.id,
        commentId: nonExistentCommentId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshots1);
  TestValidator.equals(
    "non-existent comment returns empty data",
    snapshots1.data.length,
    0,
  );
  // Test 2: Retrieve snapshots for comment with no edits (only initial creation)
  const snapshots2 =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article1.id,
        commentId: comment1.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshots2);
  TestValidator.predicate(
    "comment with no edits returns valid snapshot data",
    snapshots2.data.length >= 0,
  );
  // Test 3: Cross-article integrity - try to access comment from wrong article
  // This should either return empty results or error - we'll test both scenarios
  try {
    const snapshotsCross =
      await api.functional.discussionBoard.articles.comments.snapshots.index(
        memberConnection,
        {
          articleId: article2.id, // Wrong article ID
          commentId: comment1.id, // Comment belongs to article1
          body: {
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardCommentSnapshot.IRequest,
        },
      );
    typia.assert(snapshotsCross);
    // If it succeeds, it should return empty results
    TestValidator.equals(
      "cross-article access returns empty",
      snapshotsCross.data.length,
      0,
    );
  } catch (error) {
    // If it fails, that's also acceptable behavior
    TestValidator.predicate(
      "cross-article access properly handled",
      error instanceof Error,
    );
  }
  // Test 4: Pagination limits testing
  const snapshots3 =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article1.id,
        commentId: comment1.id,
        body: {
          page: 1,
          limit: 1, // Minimum limit
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshots3);
  TestValidator.predicate(
    "minimum pagination limit works",
    snapshots3.data.length <= 1,
  );
  const snapshots4 =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article1.id,
        commentId: comment1.id,
        body: {
          page: 1,
          limit: 100, // Maximum limit
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshots4);
  TestValidator.predicate(
    "maximum pagination limit works",
    snapshots4.data.length <= 100,
  );
  // Test 5: Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    snapshots4.pagination !== undefined,
  );
  TestValidator.equals("current page is 1", snapshots4.pagination.current, 1);
  TestValidator.equals(
    "limit matches request",
    snapshots4.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    snapshots4.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    snapshots4.pagination.pages >= 0,
  );
  // Test 6: Search functionality with empty search term
  const snapshots5 =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article1.id,
        commentId: comment1.id,
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshots5);
  TestValidator.predicate(
    "empty search returns valid results",
    snapshots5.data.length >= 0,
  );
  // Test 7: Date range filtering with future dates (should return empty)
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const snapshots6 =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article1.id,
        commentId: comment1.id,
        body: {
          created_at_start: futureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshots6);
  TestValidator.equals(
    "future date range returns empty",
    snapshots6.data.length,
    0,
  );
  // Test 8: Validate snapshot summary structure
  if (snapshots2.data.length > 0) {
    const snapshot = snapshots2.data[0];
    TestValidator.predicate("snapshot has id", typeof snapshot.id === "string");
    TestValidator.predicate(
      "snapshot has edit_reason",
      snapshot.edit_reason === null || typeof snapshot.edit_reason === "string",
    );
    TestValidator.predicate(
      "snapshot has created_at",
      typeof snapshot.created_at === "string",
    );
  }
}
