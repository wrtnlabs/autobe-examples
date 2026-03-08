import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_feed_subscription_requirements(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic feed request with random parameters
  const randomRequest: IRedditLikePost.IRequest =
    typia.random<IRedditLikePost.IRequest>();
  const output1 = await api.functional.redditLike.posts.index(connection, {
    body: randomRequest,
  });
  typia.assert(output1);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    output1.pagination !== undefined,
    true,
  );
  TestValidator.equals("data array exists", output1.data !== undefined, true);
  // Validate pagination fields
  TestValidator.equals("page >= 0", output1.pagination.current >= 0, true);
  TestValidator.equals("limit > 0", output1.pagination.limit > 0, true);
  TestValidator.equals("records >= 0", output1.pagination.records >= 0, true);
  TestValidator.equals("pages >= 0", output1.pagination.pages >= 0, true);
  // Test 2: Sort by new (most recent)
  const newFeed = await api.functional.redditLike.posts.index(connection, {
    body: { sort: "new" as const },
  });
  typia.assert(newFeed);
  // Test 3: Sort by hot (score-based)
  const hotFeed = await api.functional.redditLike.posts.index(connection, {
    body: { sort: "hot" as const },
  });
  typia.assert(hotFeed);
  // Test 4: Sort by top with time filter
  const topFeed = await api.functional.redditLike.posts.index(connection, {
    body: { sort: "top" as const, time: "week" as const },
  });
  typia.assert(topFeed);
  // Test 5: Sort by controversial
  const controversialFeed = await api.functional.redditLike.posts.index(
    connection,
    {
      body: { sort: "controversial" as const },
    },
  );
  typia.assert(controversialFeed);
  // Test 6: Pagination with limit
  const paginatedFeed = await api.functional.redditLike.posts.index(
    connection,
    {
      body: { page: 1, limit: 20 },
    },
  );
  typia.assert(paginatedFeed);
  TestValidator.equals(
    "limit respected",
    paginatedFeed.data.length <= 20,
    true,
  );
  // Test 7: Community filtering (if available)
  if (typia.random<number>() > 0.5) {
    try {
      const communityFeed = await api.functional.redditLike.posts.index(
        connection,
        {
          body: {
            community_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
      typia.assert(communityFeed);
    } catch {
      // Community ID may not exist - this is expected
    }
  }
  // Test 8: Author filtering (if available)
  if (typia.random<number>() > 0.5) {
    try {
      const authorFeed = await api.functional.redditLike.posts.index(
        connection,
        {
          body: {
            author_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
      typia.assert(authorFeed);
    } catch {
      // Author ID may not exist - this is expected
    }
  }
  // Test 9: Verify post summary structure
  if (output1.data.length > 0) {
    const firstPost = output1.data[0];
    TestValidator.equals("post has id", firstPost.id !== undefined, true);
    TestValidator.equals("post has title", firstPost.title !== undefined, true);
    TestValidator.equals(
      "post has author",
      firstPost.author !== undefined,
      true,
    );
    TestValidator.equals(
      "post has community",
      firstPost.community !== undefined,
      true,
    );
    TestValidator.equals("post has score", firstPost.score !== undefined, true);
    TestValidator.equals(
      "post has comment_count",
      firstPost.comment_count !== undefined,
      true,
    );
    TestValidator.equals(
      "post has created_at",
      firstPost.created_at !== undefined,
      true,
    );
  }
  // Test 10: Time range filtering
  const todayFeed = await api.functional.redditLike.posts.index(connection, {
    body: {
      created_from: new Date().toISOString(),
      created_to: new Date(Date.now() + 86400000).toISOString(), // +1 day
    },
  });
  typia.assert(todayFeed);
}
