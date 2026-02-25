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

export async function test_api_community_browsing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Call the community browsing endpoint with default parameters
  const page = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {} satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(page);
  // Validate pagination metadata structure and relationships
  TestValidator.equals(
    "current page defaults to 1",
    page.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is within valid range",
    page.pagination.limit >= 1 && page.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count matches data length",
    page.pagination.records === page.data.length ||
      page.pagination.records >= page.data.length,
  );
  // Validate pagination calculations
  const expectedPages =
    page.pagination.records === 0
      ? 0
      : Math.ceil(page.pagination.records / page.pagination.limit);
  TestValidator.equals(
    "pages calculation is mathematically correct",
    page.pagination.pages,
    expectedPages,
  );
  // Validate data consistency without redundant type checking
  TestValidator.predicate(
    "data array length matches pagination records for single page",
    page.pagination.pages <= 1
      ? page.data.length === page.pagination.records
      : page.data.length <= page.pagination.limit,
  );
  // Validate each community's business logic integrity
  if (page.data.length > 0) {
    const communityIds = new Set<string>();
    for (const community of page.data) {
      typia.assert(community);
      // Business logic validation only - no type checking
      TestValidator.predicate(
        "community name is not empty",
        community.name.trim().length > 0,
      );
      TestValidator.predicate(
        "community description is not empty",
        community.description.trim().length > 0,
      );
      TestValidator.predicate(
        "owner username is not empty",
        community.owner.username.trim().length > 0,
      );
      // Validate uniqueness of community IDs in the response
      TestValidator.predicate(
        "community ID is unique in response",
        !communityIds.has(community.id),
      );
      communityIds.add(community.id);
      // Validate owner karma is reasonable (business constraint)
      TestValidator.predicate(
        "owner karma is non-negative",
        community.owner.karma >= 0,
      );
    }
  }
}
