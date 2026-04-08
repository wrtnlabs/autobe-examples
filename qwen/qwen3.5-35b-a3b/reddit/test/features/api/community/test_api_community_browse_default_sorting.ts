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

export async function test_api_community_browse_default_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Send default pagination request with default parameters
  const response = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate each community record
  for (const community of response.data) {
    typia.assert(community);
    // Validate required fields exist and have correct types
    TestValidator.predicate(
      "community has valid id",
      community.id !== undefined,
    );
    TestValidator.predicate(
      "community has valid name",
      community.name !== undefined,
    );
    TestValidator.predicate(
      "community has subscriber_count",
      community.subscriber_count !== undefined,
    );
    TestValidator.predicate(
      "community has owner",
      community.owner !== undefined,
    );
    TestValidator.predicate(
      "community has created_at",
      community.created_at !== undefined,
    );
    TestValidator.predicate(
      "community has updated_at",
      community.updated_at !== undefined,
    );
    // Validate owner structure (nested within community ISummary)
    typia.assert(community.owner);
    TestValidator.predicate("owner has id", community.owner.id !== undefined);
    TestValidator.predicate(
      "owner has username",
      community.owner.username !== undefined,
    );
    TestValidator.predicate(
      "owner has karma",
      community.owner.karma !== undefined,
    );
    TestValidator.predicate(
      "owner has created_at",
      community.owner.created_at !== undefined,
    );
    // Validate soft-delete filter: all returned communities must have deleted_at === null
    TestValidator.equals(
      "community is not deleted",
      community.deleted_at,
      null,
    );
    // Validate optional fields: description and icon_url can be null
    TestValidator.predicate(
      "description is string or null",
      community.description === null ||
        typeof community.description === "string",
    );
    TestValidator.predicate(
      "icon_url is uri or null",
      community.icon_url === null || typeof community.icon_url === "string",
    );
  }
  // Validate sorting by subscriber_count in descending order
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = response.data[i];
      const next = response.data[i + 1];
      TestValidator.predicate(
        `subscriber_count desc order at index ${i}`,
        current.subscriber_count >= next.subscriber_count,
      );
    }
  }
}
