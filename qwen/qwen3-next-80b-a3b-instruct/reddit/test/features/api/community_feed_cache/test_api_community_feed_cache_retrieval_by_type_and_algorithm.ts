import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMvFeedCacheEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMvFeedCacheEntry";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMvFeedCacheEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMvFeedCacheEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_feed_cache_retrieval_by_type_and_algorithm(
  connection: api.IConnection,
): Promise<void> {
  // The IRequest interface is an empty object according to the provided DTO
  const requestBody: ICommunityMvFeedCacheEntry.IRequest =
    {} satisfies ICommunityMvFeedCacheEntry.IRequest;
  // Call the API to retrieve feed cache entries
  const response = await api.functional.community.feed_cache_entries.index(
    connection,
    { body: requestBody },
  );
  // Validate the response structure and content
  typia.assert(response);
  // Verify the response structure exactly matches the provided DTO definitions
  TestValidator.equals(
    "pagination limit is defined",
    typeof response.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination current is defined",
    typeof response.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination records is defined",
    typeof response.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is defined",
    typeof response.pagination.pages,
    "number",
  );
  // Verify data is an array
  TestValidator.equals("data is an array", Array.isArray(response.data), true);
  // Verify each data item is an object (since ISummary is empty object)
  for (const entry of response.data) {
    TestValidator.equals(
      "each data entry is an object",
      typeof entry,
      "object",
    );
  }
}
