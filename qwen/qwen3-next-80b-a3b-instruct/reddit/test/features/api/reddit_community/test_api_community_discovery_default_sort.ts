import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_discovery_default_sort(
  connection: api.IConnection,
): Promise<void> {
  // Use connection to create authenticated user connection - cannot authenticate without login endpoint, so we proceed with base connection
  const testConnection: api.IConnection = { host: connection.host };
  // Call the endpoint with default parameters (no search, default page=1, limit=25)
  const result = await api.functional.redditCommunity.communities.index(
    testConnection,
    {
      body: {},
    },
  );
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("page should be 1", result.pagination.current, 1);
  TestValidator.equals("limit should be 25", result.pagination.limit, 25);
  TestValidator.predicate(
    "total records should be positive",
    result.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages should be at least 1",
    result.pagination.pages >= 1,
  );
  // Validate that at least 1 community exists
  TestValidator.predicate(
    "at least one community returned",
    result.data.length > 0,
  );
  // Validate that communities are sorted by subscriber_count descending (highest first)
  for (let i = 0; i < result.data.length - 1; i++) {
    TestValidator.predicate(
      `community at index ${i} has subscriber_count >= community at index ${i + 1}`,
      result.data[i].subscriber_count >= result.data[i + 1].subscriber_count,
    );
  }
  // Validate structure of each community summary (using typia.assert, no manual checks)
  // typia.assert has already verified all fields are present and typed correctly
  // We only verify optional fields are properly typed (icon_url and isSubscribed)
  result.data.forEach((community) => {
    TestValidator.predicate(
      "id is UUID",
      /^[0-9a-f-]{36}$/i.test(community.id),
    );
    TestValidator.predicate(
      "name is non-empty string",
      typeof community.name === "string" && community.name.length > 0,
    );
    TestValidator.predicate(
      "description is non-empty string",
      typeof community.description === "string" &&
        community.description.length > 0,
    );
    TestValidator.predicate(
      "icon_url is either null or a valid URI",
      community.icon_url === null ||
        (typeof community.icon_url === "string" &&
          community.icon_url.length > 0),
    );
    TestValidator.predicate(
      "subscriber_count is integer >= 0",
      Number.isInteger(community.subscriber_count) &&
        community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "created_at is ISO datetime string",
      typeof community.created_at === "string" &&
        !isNaN(new Date(community.created_at).getTime()),
    );
    TestValidator.predicate(
      "updated_at is ISO datetime string",
      typeof community.updated_at === "string" &&
        !isNaN(new Date(community.updated_at).getTime()),
    );
  });
}