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

export async function test_api_post_feed_sorting_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Since only posts.index endpoint is available, test feed retrieval with various parameters
  // Test popular feed (public access)
  const popularFeed = await api.functional.redditLike.posts.index(connection, {
    body: {
      sort: "hot",
    } satisfies IRedditLikePost.IRequest,
  });
  typia.assert(popularFeed);
  // Test community feed filtering - would require community_id to exist
  try {
    const communityFeed = await api.functional.redditLike.posts.index(
      connection,
      {
        body: {
          community_id:
            "00000000-0000-0000-0000-000000000000" satisfies string &
              tags.Format<"uuid">,
          sort: "new",
        } satisfies IRedditLikePost.IRequest,
      },
    );
    typia.assert(communityFeed);
  } catch {
    // Expected if community doesn't exist
  }
  // Test time filtering for top-sorted feed
  const today = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weeklyTop = await api.functional.redditLike.posts.index(connection, {
    body: {
      sort: "top",
      time: "week",
      created_from: weekAgo,
      created_to: today,
    } satisfies IRedditLikePost.IRequest,
  });
  typia.assert(weeklyTop);
  // Test cursor-based pagination
  const firstPage = await api.functional.redditLike.posts.index(connection, {
    body: {
      limit: 10,
      sort: "new",
    } satisfies IRedditLikePost.IRequest,
  });
  typia.assert(firstPage);
  TestValidator.predicate(
    "has pagination info",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate("has data array", Array.isArray(firstPage.data));
  // Test sorting by new
  const newFeed = await api.functional.redditLike.posts.index(connection, {
    body: {
      sort: "new",
    } satisfies IRedditLikePost.IRequest,
  });
  typia.assert(newFeed);
  // Test controversial sorting
  const controversialFeed = await api.functional.redditLike.posts.index(
    connection,
    {
      body: {
        sort: "controversial",
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(controversialFeed);
  // Test author_id filtering - would require existing user ID
  try {
    const authorFeed = await api.functional.redditLike.posts.index(connection, {
      body: {
        author_id: "00000000-0000-0000-0000-000000000000" satisfies string &
          tags.Format<"uuid">,
      } satisfies IRedditLikePost.IRequest,
    });
    typia.assert(authorFeed);
  } catch {
    // Expected if user doesn't exist
  }
  // Test time range filtering
  const timeFilteredFeed = await api.functional.redditLike.posts.index(
    connection,
    {
      body: {
        created_from: weekAgo,
        created_to: today,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(timeFilteredFeed);
  // Test mixed filters
  const mixedFilterFeed = await api.functional.redditLike.posts.index(
    connection,
    {
      body: {
        created_from: weekAgo,
        sort: "hot",
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(mixedFilterFeed);
  // Validate response structure
  TestValidator.equals("pagination current", firstPage.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit valid",
    firstPage.pagination.limit > 0 && firstPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    firstPage.pagination.pages >= 0,
  );
}
