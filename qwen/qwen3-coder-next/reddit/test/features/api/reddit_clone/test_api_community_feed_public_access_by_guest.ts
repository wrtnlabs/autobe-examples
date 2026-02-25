import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_feed_public_access_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // Test the community feed endpoint for public access by guests
  const guestConnection: api.IConnection = { host: connection.host };
  // Test 1: Verify non-existent community returns appropriate error
  await TestValidator.error(
    "should return error for non-existent community",
    async () => {
      await api.functional.redditClone.communities.posts.index(
        guestConnection,
        {
          communityId: "00000000-0000-0000-0000-000000000000",
          body: {
            sort: "hot" as const,
            page: 1,
            limit: 10,
          },
        },
      );
    },
  );
  // Test 2: Verify basic request structure with valid sorts
  const sorts = ["hot", "new", "top", "controversial"] as const;
  for (const sort of sorts) {
    const feed = await api.functional.redditClone.communities.posts.index(
      guestConnection,
      {
        communityId: "test-community-id",
        body: {
          sort,
          page: 1,
          limit: 10,
        },
      },
    );
    typia.assert(feed);
    // Validate response structure
    TestValidator.equals("pagination current page", feed.pagination.current, 1);
    TestValidator.equals("pagination limit", feed.pagination.limit, 10);
    TestValidator.predicate(
      "pagination records >= 0",
      feed.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      feed.pagination.pages >= 0,
    );
    // Validate data array structure
    TestValidator.predicate("data is array", Array.isArray(feed.data));
  }
  // Test 3: Verify pagination with different limits
  const paginatedFeed =
    await api.functional.redditClone.communities.posts.index(guestConnection, {
      communityId: "test-community-id",
      body: {
        sort: "hot" as const,
        page: 1,
        limit: 1,
      },
    });
  typia.assert(paginatedFeed);
  TestValidator.equals("paginated data length", paginatedFeed.data.length, 1);
}
