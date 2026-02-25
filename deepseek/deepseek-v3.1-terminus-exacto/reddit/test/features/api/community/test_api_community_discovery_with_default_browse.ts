import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_discovery_with_default_browse(
  connection: api.IConnection,
): Promise<void> {
  // Test default browsing with empty parameters
  const response = await api.functional.communityPlatform.communities.search(
    connection,
    {
      body: {} satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination business logic
  TestValidator.predicate(
    "pagination current is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Validate each community summary structure
  for (const community of response.data) {
    typia.assert(community);
    // Business logic validations (not type validations)
    TestValidator.predicate(
      "community name is not empty",
      community.name.length > 0,
    );
    TestValidator.predicate(
      "community description is not empty",
      community.description.length > 0,
    );
    TestValidator.predicate(
      "owner username is not empty",
      community.owner.username.length > 0,
    );
  }
  // Test with explicit pagination parameters
  const paginatedResponse =
    await api.functional.communityPlatform.communities.search(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(paginatedResponse);
  // Validate pagination parameters were respected
  TestValidator.equals(
    "page parameter respected",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit parameter respected",
    paginatedResponse.pagination.limit,
    10,
  );
  // Business logic: data length should not exceed limit
  TestValidator.predicate(
    "data length <= limit",
    paginatedResponse.data.length <= paginatedResponse.pagination.limit,
  );
}
