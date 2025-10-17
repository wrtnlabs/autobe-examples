import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";
import type { IEconomicBoardPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPosts";
import type { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardPost";

export async function test_api_post_search_by_status_filter(
  connection: api.IConnection,
) {
  // 1. Create a topic for posting
  const topic: IEconomicBoardTopic =
    await api.functional.economicBoard.admin.topics.create(connection, {
      body: {
        name: "Inflation",
      } satisfies IEconomicBoardTopic.ICreate,
    });
  typia.assert(topic);

  // 2. Create three posts with different statuses:
  //    - One pending post (will be published later for test)
  //    - One pending post (will be rejected later for test)
  //    - One pending post (will be kept pending to test status filtering)
  const pendingPost1: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(pendingPost1);
  TestValidator.equals(
    "post initial status is pending",
    pendingPost1.status,
    "pending",
  );

  const pendingPost2: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(pendingPost2);
  TestValidator.equals(
    "post initial status is pending",
    pendingPost2.status,
    "pending",
  );

  const pendingPost3: IEconomicBoardPost =
    await api.functional.economicBoard.member.posts.create(connection, {
      body: {
        economic_board_topics_id: topic.id,
        subject: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IEconomicBoardPost.ICreate,
    });
  typia.assert(pendingPost3);
  TestValidator.equals(
    "post initial status is pending",
    pendingPost3.status,
    "pending",
  );

  // 3. Approve the first pending post to make it published
  const approvedPost: IEconomicBoardPosts =
    await api.functional.admin.posts.approve(connection, {
      postId: pendingPost1.id,
    });
  typia.assert(approvedPost);
  TestValidator.equals(
    "post status changed to published",
    approvedPost.status,
    "published",
  );

  // 4. Reject the second pending post
  const rejectedPost: IEconomicBoardPosts =
    await api.functional.admin.posts.reject(connection, {
      postId: pendingPost2.id,
      body: {
        moderation_reason: "Content violates moderation policy",
      } satisfies IEconomicBoardPosts.IReject,
    });
  typia.assert(rejectedPost);
  TestValidator.equals(
    "post status changed to rejected",
    rejectedPost.status,
    "rejected",
  );

  // 5. Search with status: "published" - should only return the approved post
  const publishedSearch: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: {
        status: "published",
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardPost.IRequest,
    });
  typia.assert(publishedSearch);
  TestValidator.equals(
    "status filter: published",
    publishedSearch.pagination.records,
    1,
  );
  TestValidator.predicate("only published posts in results", () =>
    publishedSearch.data.every((post) => post.status === "published"),
  );

  // 6. Search with status: "pending" - should only return the remaining pending post (pendingPost3)
  const pendingSearch: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardPost.IRequest,
    });
  typia.assert(pendingSearch);
  TestValidator.equals(
    "status filter: pending",
    pendingSearch.pagination.records,
    1,
  );
  TestValidator.predicate("only pending posts in results", () =>
    pendingSearch.data.every((post) => post.status === "pending"),
  );

  // 7. Search with status: "rejected" - should only return the rejected post
  const rejectedSearch: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: {
        status: "rejected",
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardPost.IRequest,
    });
  typia.assert(rejectedSearch);
  TestValidator.equals(
    "status filter: rejected",
    rejectedSearch.pagination.records,
    1,
  );
  TestValidator.predicate("only rejected posts in results", () =>
    rejectedSearch.data.every((post) => post.status === "rejected"),
  );

  // 8. Search without status filter (default) - should only return published posts (as public users see)
  const defaultSearch: IPageIEconomicBoardPost =
    await api.functional.economicBoard.posts.search(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEconomicBoardPost.IRequest,
    });
  typia.assert(defaultSearch);
  TestValidator.equals(
    "default search returns published posts",
    defaultSearch.pagination.records,
    1,
  );
  TestValidator.predicate("default search shows only published", () =>
    defaultSearch.data.every((post) => post.status === "published"),
  );

  // 9. Verify that status: "deleted" is not testable (no API provided to delete; hard deletion should not be accessible through search)
  // We are not testing deleted because no endpoint exists to create/delete posts.
  // The API spec shows searching for "deleted" status is possible, but no delete endpoint is provided.
  // We test the existence of the filter parameter but do not create any deleted posts.
  // We do not validate any deleted posts because we cannot create them.
}
