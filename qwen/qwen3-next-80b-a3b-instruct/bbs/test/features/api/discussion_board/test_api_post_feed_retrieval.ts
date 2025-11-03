import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";

export async function test_api_post_feed_retrieval(
  connection: api.IConnection,
) {
  const feed: IPageIDiscussionBoardPost.ISummary =
    await api.functional.discussionBoard.posts.index(connection);
  typia.assert(feed);

  // Validate pagination structure
  TestValidator.equals("pagination exists", feed.pagination, feed.pagination);
  TestValidator.predicate(
    "current page is at least 1",
    feed.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", feed.pagination.limit > 0);
  TestValidator.predicate(
    "total records is non-negative",
    feed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is at least 1",
    feed.pagination.pages >= 1,
  );

  // Validate posts array is present
  TestValidator.predicate(
    "posts array exists and is an array",
    Array.isArray(feed.data),
  );

  // Validate at least one post is returned (assuming system has data)
  TestValidator.predicate("at least one post in feed", feed.data.length > 0);

  // Validate each post is a string (as defined by IDiscussionBoardPost.ISummary = string)
  for (const post of feed.data) {
    TestValidator.equals("post is a string", typeof post, "string");
  }
}
