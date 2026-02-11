import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_communities_feed_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Generate random community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test default pagination with valid community
  const defaultFeed =
    await api.functional.redditPlatform.communities.feed.index(connection, {
      communityId,
    });
  typia.assert(defaultFeed);
  // Validate default pagination structure
  TestValidator.equals("default page is 1", defaultFeed.pagination.current, 1);
  TestValidator.equals(
    "default limit exists",
    defaultFeed.pagination.limit > 0,
    true,
  );
  TestValidator.predicate(
    "default has posts or is empty",
    defaultFeed.data.length >= 0,
  );
  TestValidator.predicate(
    "default records matches data length",
    defaultFeed.pagination.records === defaultFeed.data.length,
  );
  TestValidator.predicate(
    "default pages calculated correctly",
    defaultFeed.pagination.pages ===
      Math.ceil(defaultFeed.pagination.records / defaultFeed.pagination.limit),
  );
  // Test with empty community ID (likely no posts exist)
  const emptyCommunityId = typia.random<string & tags.Format<"uuid">>();
  const emptyFeed = await api.functional.redditPlatform.communities.feed.index(
    connection,
    {
      communityId: emptyCommunityId,
    },
  );
  typia.assert(emptyFeed);
  // Validate empty feed structure
  TestValidator.equals(
    "empty feed current page",
    emptyFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty feed limit exists",
    emptyFeed.pagination.limit > 0,
    true,
  );
  TestValidator.equals("empty feed has no posts", emptyFeed.data.length, 0);
  TestValidator.equals(
    "empty feed total is 0",
    emptyFeed.pagination.records,
    0,
  );
  TestValidator.equals("empty feed pages is 0", emptyFeed.pagination.pages, 0);
  // Verify pagination consistency by calling same endpoint again
  const firstFeed = await api.functional.redditPlatform.communities.feed.index(
    connection,
    {
      communityId,
    },
  );
  typia.assert(firstFeed);
  const secondFeed = await api.functional.redditPlatform.communities.feed.index(
    connection,
    {
      communityId,
    },
  );
  typia.assert(secondFeed);
  TestValidator.equals(
    "pagination consistency check",
    firstFeed.pagination.records,
    secondFeed.pagination.records,
  );
  TestValidator.equals(
    "data consistency check",
    firstFeed.data.length,
    secondFeed.data.length,
  );
}
