import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test member comment search with content-based filtering and sorting.
 *
 * This test validates the search functionality for discussion board comments,
 * including content filtering, status-based filtering, sorting options,
 * pagination, and thread level filtering. Since comment creation API is not
 * available, this test focuses on validating the search functionality using the
 * available comment search endpoint.
 */
export async function test_api_member_comment_search_with_content_filtering(
  connection: api.IConnection,
) {
  // Test various search and filter combinations using the available search API

  // 1. Test basic search functionality with empty request
  const emptySearch =
    await api.functional.discussionBoard.member.posts.comments.index(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(emptySearch);

  TestValidator.predicate(
    "empty search should return valid pagination structure",
    emptySearch.pagination !== undefined &&
      emptySearch.pagination.current >= 0 &&
      emptySearch.pagination.limit >= 0 &&
      emptySearch.pagination.records >= 0 &&
      emptySearch.pagination.pages >= 0,
  );

  // 2. Test search with specific parameters
  const searchWithParams =
    await api.functional.discussionBoard.member.posts.comments.index(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          search: "test",
          status: "published",
          thread_level: 0,
          page: 1,
          limit: 5,
          order_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(searchWithParams);

  TestValidator.predicate(
    "search with parameters should return valid response structure",
    Array.isArray(searchWithParams.data) &&
      searchWithParams.pagination !== undefined,
  );

  // 3. Test different sorting options
  const ascendingSort =
    await api.functional.discussionBoard.member.posts.comments.index(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "published",
          order_by: "created_at",
          order: "asc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(ascendingSort);

  const descendingSort =
    await api.functional.discussionBoard.member.posts.comments.index(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "published",
          order_by: "created_at",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(descendingSort);

  TestValidator.predicate(
    "different sorting orders should produce valid responses",
    ascendingSort.pagination !== undefined &&
      descendingSort.pagination !== undefined,
  );

  // 4. Test pagination with different limits
  const smallPage =
    await api.functional.discussionBoard.member.posts.comments.index(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(smallPage);

  const largePage =
    await api.functional.discussionBoard.member.posts.comments.index(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(largePage);

  TestValidator.predicate(
    "different page limits should be handled correctly",
    smallPage.pagination.limit === 1 && largePage.pagination.limit === 100,
  );

  // 5. Test status filtering
  const draftStatusSearch =
    await api.functional.discussionBoard.member.posts.comments.index(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "draft",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(draftStatusSearch);

  const publishedStatusSearch =
    await api.functional.discussionBoard.member.posts.comments.index(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "published",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(publishedStatusSearch);

  TestValidator.predicate(
    "different status filters should produce valid responses",
    draftStatusSearch.pagination !== undefined &&
      publishedStatusSearch.pagination !== undefined,
  );

  // 6. Test thread level filtering
  const threadLevelSearch =
    await api.functional.discussionBoard.member.posts.comments.index(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          thread_level: 0,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(threadLevelSearch);

  TestValidator.predicate(
    "thread level filtering should produce valid response",
    threadLevelSearch.pagination !== undefined,
  );

  // 7. Test author filtering
  const authorSearch =
    await api.functional.discussionBoard.member.posts.comments.index(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          author_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(authorSearch);

  TestValidator.predicate(
    "author filtering should produce valid response",
    authorSearch.pagination !== undefined,
  );

  // 8. Test error handling with invalid parameters
  await TestValidator.error(
    "invalid post ID should result in error",
    async () => {
      await api.functional.discussionBoard.member.posts.comments.index(
        connection,
        {
          postId: "invalid-uuid-format",
          body: {
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardComment.IRequest,
        },
      );
    },
  );

  // 9. Test combination of multiple filters
  const combinedSearch =
    await api.functional.discussionBoard.member.posts.comments.index(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          search: "discussion",
          status: "published",
          thread_level: 0,
          author_id: typia.random<string & tags.Format<"uuid">>(),
          order_by: "created_at",
          order: "desc",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(combinedSearch);

  TestValidator.predicate(
    "combined search filters should produce valid response",
    combinedSearch.pagination !== undefined &&
      Array.isArray(combinedSearch.data),
  );
}
