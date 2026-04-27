import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_search_no_results(
  connection: api.IConnection,
): Promise<void> {
  // No authentication required — this endpoint is publicly accessible.
  // Search with a query string guaranteed not to match any community name.
  const searchQuery = "xyznonexistent12345_";
  const body = {
    search: searchQuery,
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformCommunity.IRequest;
  const output = await api.functional.communityPlatform.communities.search(
    connection,
    { body },
  );
  typia.assert(output);
  // Validate empty data array
  TestValidator.equals("data array is empty", output.data.length, 0);
  // Validate pagination metadata
  TestValidator.equals("pagination records is 0", output.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", output.pagination.pages, 0);
  TestValidator.equals("pagination current is 1", output.pagination.current, 1);
  TestValidator.equals(
    "pagination limit matches request",
    output.pagination.limit,
    20,
  );
}
