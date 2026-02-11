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
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Request default sorted communities (no sort specified, defaults to 'name')
  const response: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(guestConnection, {
      body: {},
    });
  typia.assert(response);
  // Validate pagination
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // Validate data array length (20 or fewer)
  TestValidator.predicate(
    "data has at most 20 items",
    response.data.length <= 20,
  );
  // Validate sorting (alphabetical by name, ignoring null names)
  const nonNullCommunities = response.data.filter((c) => c.name !== null);
  if (nonNullCommunities.length > 1) {
    for (let i = 0; i < nonNullCommunities.length - 1; i++) {
      TestValidator.predicate(
        "communities sorted alphabetically",
        nonNullCommunities[i].name <= nonNullCommunities[i + 1].name,
      );
    }
  }
}
