import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_browsing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Make request without authentication (authorizationActor: null)
  const response = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // Validate pagination defaults
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.equals(
    "pages matches calculation",
    response.pagination.pages,
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // Validate data array
  const data = response.data;
  typia.assert(data);
  // Validate each community in data array
  if (data.length > 0) {
    for (const community of data) {
      typia.assert(community);
      // Validate author field is present
      typia.assert(community.author);
      // Validate optional fields (description, icon_url) can be null
      if (community.description !== undefined) {
        typia.assert(community.description);
      }
      if (community.icon_url !== undefined) {
        typia.assert(community.icon_url);
      }
    }
    // Validate sorting: created_at in descending order (newest first)
    if (data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        const prevDate = new Date(data[i - 1].created_at).getTime();
        const currDate = new Date(data[i].created_at).getTime();
        TestValidator.predicate(
          "communities sorted by created_at descending",
          currDate <= prevDate,
        );
      }
    }
  } else {
    // Empty result case validation
    TestValidator.equals(
      "empty data has zero records",
      response.pagination.records,
      0,
    );
    TestValidator.equals("empty data array is empty", data.length, 0);
  }
}
