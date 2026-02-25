import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_popular_top_sort_with_week_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create a test connection
  const testConnection: api.IConnection = { host: connection.host };
  // Define test parameters for popular feed with top sort and week filter
  const testParams: IRedditCommunityPost.IRequest = {
    sort: "top",
    timeFilter: "week",
    page: 1,
    limit: 25,
  };
  // Call the endpoint with patched parameters
  const result = await api.functional.redditCommunity.feeds.popular.index(
    testConnection,
    { body: testParams },
  );
  typia.assert(result);
  // Verify response structure
  TestValidator.equals(
    "result contains pagination",
    result.pagination !== null,
    true,
  );
  TestValidator.equals(
    "result contains data array",
    result.data !== null && Array.isArray(result.data),
    true,
  );
  TestValidator.equals(
    "pagination limit matches request",
    result.pagination.limit,
    25,
  );
  TestValidator.equals(
    "pagination page matches request",
    result.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => result.pagination.pages >= 0,
  );
  // Verify data items have correct structure
  if (result.data.length > 0) {
    const firstPost = result.data[0];
    TestValidator.equals("post has id", typeof firstPost.id === "string", true);
    TestValidator.predicate("post has valid uuid format", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        firstPost.id,
      ),
    );
    TestValidator.equals(
      "post has title",
      typeof firstPost.title === "string",
      true,
    );
    TestValidator.equals("post has author", firstPost.author !== null, true);
    TestValidator.equals(
      "post has community",
      firstPost.community !== null,
      true,
    );
    TestValidator.equals(
      "post has voteScore",
      typeof firstPost.voteScore === "number",
      true,
    );
    TestValidator.equals(
      "post has commentCount",
      typeof firstPost.commentCount === "number",
      true,
    );
    TestValidator.equals(
      "post has createdAt",
      typeof firstPost.createdAt === "string",
      true,
    );
    TestValidator.predicate("post has valid date-time format", () =>
      /^([0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(?:Z|[+-][01][0-9]:[0-5][0-9])\b)$/.test(
        firstPost.createdAt,
      ),
    );
    TestValidator.equals(
      "post has updatedAt",
      typeof firstPost.updatedAt === "string",
      true,
    );
    TestValidator.predicate(
      "post has valid date-time format for updatedAt",
      () =>
        /^([0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(?:Z|[+-][01][0-9]:[0-5][0-9])\b)$/.test(
          firstPost.updatedAt,
        ),
    );
    TestValidator.equals(
      "post has url or null",
      firstPost.url === null || typeof firstPost.url === "string",
      true,
    );
    TestValidator.equals(
      "post has imageUrl or null",
      firstPost.imageUrl === null || typeof firstPost.imageUrl === "string",
      true,
    );
    if (firstPost.author !== null) {
      TestValidator.equals(
        "author has id",
        typeof firstPost.author.id === "string",
        true,
      );
      TestValidator.equals(
        "author has username",
        typeof firstPost.author.username === "string",
        true,
      );
      TestValidator.equals(
        "author has display_name",
        typeof firstPost.author.display_name === "string",
        true,
      );
      TestValidator.equals(
        "author has karma_score",
        typeof firstPost.author.karma_score === "number",
        true,
      );
      TestValidator.equals(
        "author has created_at",
        typeof firstPost.author.created_at === "string",
        true,
      );
      TestValidator.predicate("author has valid date-time format", () =>
        /^([0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(?:Z|[+-][01][0-9]:[0-5][0-9])\b)$/.test(
          firstPost.author.created_at,
        ),
      );
    }
    if (firstPost.community !== null) {
      TestValidator.equals(
        "community has id",
        typeof firstPost.community.id === "string",
        true,
      );
      TestValidator.equals(
        "community has name",
        typeof firstPost.community.name === "string",
        true,
      );
      TestValidator.equals(
        "community has description",
        typeof firstPost.community.description === "string",
        true,
      );
      TestValidator.equals(
        "community has icon_url or null",
        firstPost.community.icon_url === null ||
          typeof firstPost.community.icon_url === "string",
        true,
      );
      TestValidator.equals(
        "community has subscriber_count",
        typeof firstPost.community.subscriber_count === "number",
        true,
      );
      TestValidator.equals(
        "community has created_at",
        typeof firstPost.community.created_at === "string",
        true,
      );
      TestValidator.equals(
        "community has updated_at",
        typeof firstPost.community.updated_at === "string",
        true,
      );
      TestValidator.predicate("community has valid date-time format", () =>
        /^([0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(?:Z|[+-][01][0-9]:[0-5][0-9])\b)$/.test(
          firstPost.community.created_at,
        ),
      );
    }
  }
}
