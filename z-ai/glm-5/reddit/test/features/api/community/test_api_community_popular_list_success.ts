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

export async function test_api_community_popular_list_success(
  connection: api.IConnection,
): Promise<void> {
  // Call the popular communities endpoint (public, no auth required)
  const response =
    await api.functional.community.communities.popular(connection);
  // Validate the response structure - typia.assert performs complete validation
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // If there are communities, validate sorting and structure
  if (response.data.length > 1) {
    // Verify communities are sorted by subscriber_count DESC, then created_at ASC
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = response.data[i];
      const next = response.data[i + 1];
      // Primary sort: subscriber_count DESC
      TestValidator.predicate(
        `subscriber_count descending at index ${i}`,
        current.subscriber_count >= next.subscriber_count,
      );
      // Secondary sort: created_at ASC (when subscriber_count is equal)
      if (current.subscriber_count === next.subscriber_count) {
        TestValidator.predicate(
          `created_at ascending for equal subscriber_count at index ${i}`,
          new Date(current.created_at).getTime() <=
            new Date(next.created_at).getTime(),
        );
      }
    }
  }
  // Validate pagination consistency
  if (response.pagination.limit > 0 && response.pagination.records > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      response.pagination.pages,
      expectedPages,
    );
  }
}
