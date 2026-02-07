import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMvPostFeedIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMvPostFeedIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMvPostFeedIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMvPostFeedIndex";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_feed_community_top_cursor(
  connection: api.IConnection,
): Promise<void> {
  // Create base user connection
  const userConnection: api.IConnection = { host: connection.host };
  // First request - get initial page
  const firstResponse = await api.functional.community.post_feed_indices.index(
    userConnection,
    {
      body: {
        feed_type: "community",
        sort_algorithm: "top",
      },
    },
  );
  typia.assert(firstResponse);
  // Verify the structure: has pagination and data
  TestValidator.equals(
    "response has pagination",
    firstResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "response has data",
    firstResponse.data !== undefined,
    true,
  );
  // Verify pagination structure
  TestValidator.predicate(
    "pagination has current page ≥ 1",
    () => firstResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit > 0",
    () => firstResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records ≥ 0",
    () => firstResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages ≥ 0",
    () => firstResponse.pagination.pages >= 0,
  );
  // Verify data is an array (but empty objects, so we can't verify properties)
  TestValidator.predicate("data is an array", () =>
    Array.isArray(firstResponse.data),
  );
  // If we have data, test cursor pagination
  if (firstResponse.data.length > 0 && firstResponse.pagination.limit > 0) {
    // Get cursor values from last item
    // Note: We cannot access any properties since ISummary is {}
    // But we need to create cursor params - so we use the last array index
    // We'll request another page with a different limit to simulate cursor
    const secondResponse =
      await api.functional.community.post_feed_indices.index(userConnection, {
        body: {
          feed_type: "community",
          sort_algorithm: "top",
          limit: 1,
        },
      });
    typia.assert(secondResponse);
    // Verify pagination structure is consistent
    TestValidator.predicate(
      "second response has pagination",
      () => secondResponse.pagination !== undefined,
    );
    TestValidator.predicate(
      "second response has data",
      () => secondResponse.data !== undefined,
    );
    // Verify limit changed
    TestValidator.equals(
      "second request has limit 1",
      secondResponse.pagination.limit,
      1,
    );
    // Try to use cursor with arbitrary sort_order and last_updated values
    // Since we have no knowledge of real properties (empty DTO), we must still provide values
    // API expects them to be provided if cursor requested
    const thirdResponse =
      await api.functional.community.post_feed_indices.index(userConnection, {
        body: {
          feed_type: "community",
          sort_algorithm: "top",
          sort_order: 1,
          last_updated: new Date().toISOString(),
        },
      });
    typia.assert(thirdResponse);
    // Verify we get a valid response with cursor parameters
    TestValidator.equals(
      "third response has pagination",
      thirdResponse.pagination !== undefined,
      true,
    );
    TestValidator.equals(
      "third response has data",
      thirdResponse.data !== undefined,
      true,
    );
  }
  // At minimum, verify that the function works with empty data structure
  // This is only possible because the DTO is empty - we must not assume any properties
}
