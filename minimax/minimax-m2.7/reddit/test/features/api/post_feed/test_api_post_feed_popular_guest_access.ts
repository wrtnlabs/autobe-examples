import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest accessing the popular post feed without authentication.
 *
 * Verifies that unauthenticated users can successfully retrieve the popular feed
 * showing posts sorted by engagement (hot algorithm). Validates response contains
 * paginated post summaries with title, author username, community name, vote score,
 * comment count, createdAt timestamp, and type-specific content preview.
 * Tests pagination metadata and limit parameter.
 */
export async function test_api_post_feed_popular_guest_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest retrieves popular post feed with hot sorting
  const popularFeed = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "hot",
      limit: 10,
    } satisfies IRedditClonePost.IRequest,
  });
  typia.assert(popularFeed);
  // 2. Validate pagination metadata structure
  TestValidator.equals(
    "has pagination metadata",
    !!popularFeed.pagination,
    true,
  );
  TestValidator.predicate(
    "current page is valid",
    popularFeed.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", popularFeed.pagination.limit >= 0);
  TestValidator.predicate(
    "records count is valid",
    popularFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    popularFeed.pagination.pages >= 0,
  );
  // 3. Validate posts array exists
  TestValidator.equals("has data array", !!popularFeed.data, true);
  TestValidator.predicate("posts is array", Array.isArray(popularFeed.data));
  // 4. Validate each post summary structure
  for (const post of popularFeed.data) {
    typia.assert(post);
    // Validate required fields
    TestValidator.equals("has id", !!post.id, true);
    TestValidator.equals("has title", !!post.title, true);
    TestValidator.equals("has author", !!post.author, true);
    TestValidator.equals("has community", !!post.community, true);
    TestValidator.equals(
      "has vote score",
      typeof post.voteScore === "number",
      true,
    );
    TestValidator.equals(
      "has comment count",
      typeof post.commentCount === "number",
      true,
    );
    TestValidator.equals("has createdAt", !!post.createdAt, true);
    TestValidator.equals(
      "has content preview",
      post.contentPreview !== null && post.contentPreview !== undefined,
      true,
    );
    TestValidator.equals("has type", !!post.type, true);
    // Validate author structure
    TestValidator.equals("author has id", !!post.author.id, true);
    TestValidator.equals("author has username", !!post.author.username, true);
    // Validate community structure
    TestValidator.equals("community has id", !!post.community.id, true);
    TestValidator.equals("community has name", !!post.community.name, true);
    // Validate type is one of allowed values
    TestValidator.predicate(
      "type is valid",
      post.type === "text" || post.type === "link" || post.type === "image",
    );
    // Validate content preview is string
    TestValidator.equals(
      "content preview is string",
      typeof post.contentPreview === "string",
      true,
    );
  }
  // 5. Test pagination with different limit values
  const smallPageFeed = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "hot",
        limit: 5,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(smallPageFeed);
  TestValidator.predicate(
    "small page has valid limit",
    smallPageFeed.pagination.limit === 5,
  );
  // 6. Test page 1 with offset pagination
  const pageOneFeed = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "hot",
      page: 1,
      limit: 10,
    } satisfies IRedditClonePost.IRequest,
  });
  typia.assert(pageOneFeed);
  TestValidator.predicate(
    "page 1 is valid",
    pageOneFeed.pagination.current === 1,
  );
}
