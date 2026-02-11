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

export async function test_api_communities_feed_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate random community ID for testing
  const testCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Test community feed retrieval with valid community ID
  const feed = await api.functional.redditPlatform.communities.feed.index(
    connection,
    {
      communityId: testCommunityId,
    },
  );
  // Validate response structure
  typia.assert(feed);
  // Validate pagination structure
  TestValidator.equals(
    "feed has pagination object",
    typeof feed.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination has current",
    typeof feed.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof feed.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records",
    typeof feed.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages",
    typeof feed.pagination.pages,
    "number",
  );
  // Validate data array structure
  TestValidator.equals("feed has data array", Array.isArray(feed.data), true);
  // Validate post summary structure for each post
  for (const post of feed.data) {
    TestValidator.equals("post has id", typeof post.id, "string");
    TestValidator.equals("post has title", typeof post.title, "string");
    TestValidator.equals(
      "post has type",
      ["TEXT", "LINK", "IMAGE"].includes(post.type),
      true,
    );
    TestValidator.equals(
      "post has author",
      post.author !== null && post.author !== undefined,
      true,
    );
    if (post.author) {
      TestValidator.equals("author has id", typeof post.author.id, "string");
      TestValidator.equals(
        "author has username",
        typeof post.author.username,
        "string",
      );
    }
    TestValidator.equals(
      "post has community",
      post.community !== null && post.community !== undefined,
      true,
    );
    if (post.community) {
      TestValidator.equals(
        "community has id",
        typeof post.community.id,
        "string",
      );
      TestValidator.equals(
        "community has name",
        typeof post.community.name,
        "string",
      );
    }
    TestValidator.equals("post has voteScore", typeof post.voteScore, "number");
    TestValidator.equals(
      "post has commentCount",
      typeof post.commentCount,
      "number",
    );
    TestValidator.equals("post has createdAt", typeof post.createdAt, "string");
  }
  // Test with different community ID
  const anotherCommunityId = typia.random<string & tags.Format<"uuid">>();
  const anotherFeed =
    await api.functional.redditPlatform.communities.feed.index(connection, {
      communityId: anotherCommunityId,
    });
  typia.assert(anotherFeed);
  TestValidator.notEquals(
    "different community returns different feed data",
    anotherFeed.pagination.records,
    feed.pagination.records,
  );
}
