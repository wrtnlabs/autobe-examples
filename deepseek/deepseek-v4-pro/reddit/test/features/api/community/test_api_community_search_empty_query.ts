import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that searching communities with an empty query returns HTTP 200 with an empty result set.
 *
 * Verifies that the community search endpoint gracefully handles the empty query edge case by returning HTTP 200 (not an error) with a valid pagination object showing zero records and zero pages. This ensures the UI can display a clean empty state without signaling a failure condition.
 *
 * 1. Call the community search endpoint without specifying a search query.
 * 2. Validate the response structure with typia.assert.
 * 3. Verify the response contains an empty data array and pagination with zero records and zero pages.
 */
export async function test_api_community_search_empty_query(
  connection: api.IConnection,
): Promise<void> {
  const output =
    await api.functional.communityHub.communities.search(connection);
  typia.assert(output);
  TestValidator.equals("data is empty", output.data.length, 0);
  TestValidator.equals("records is zero", output.pagination.records, 0);
  TestValidator.equals("pages is zero", output.pagination.pages, 0);
}
