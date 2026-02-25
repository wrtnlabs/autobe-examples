import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving the list of newly created communities from the past 30 days.
 * This endpoint is publicly accessible (no authentication required) and returns
 * communities created within the last 30 days, sorted by creation date descending.
 */
export async function test_api_community_new_communities_list_success(
  connection: api.IConnection,
): Promise<void> {
  // Call the API without authentication - this is a public endpoint
  const response: IPageICommunityCommunity.ISummary =
    await api.functional.community.communities._new.recent(connection);
  // Validate response structure - typia.assert performs complete validation
  typia.assert(response);
  // Verify pagination metadata structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current is valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    response.pagination.pages >= 0,
  );
  // Verify data is an array
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // If there are communities, verify sorting and fields
  if (response.data.length > 0) {
    // Verify sorting: created_at should be in descending order (newest first)
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentCreatedAt = new Date(response.data[i].created_at).getTime();
      const nextCreatedAt = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `communities sorted by created_at descending at index ${i}`,
        currentCreatedAt >= nextCreatedAt,
      );
    }
    // Verify all communities are from the last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const community of response.data) {
      const createdAt = new Date(community.created_at).getTime();
      TestValidator.predicate(
        `community ${community.id} created within last 30 days`,
        createdAt >= thirtyDaysAgo,
      );
    }
  }
}
