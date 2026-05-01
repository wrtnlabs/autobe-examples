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
 * Test default community browsing without search or sort parameters.
 *
 * Validates that the community browse endpoint returns communities sorted by
 * popularity (subscriber count descending) with default pagination values of
 * page 1 and limit 20 when no parameters are provided in the request body.
 *
 * Verifies that pagination metadata is internally consistent with the
 * returned data and that communities are correctly ordered. The endpoint
 * is publicly accessible without authentication.
 *
 * 1. Call browse endpoint with empty request body (all defaults).
 * 2. Verify default pagination values (page 1, limit 20).
 * 3. Verify pagination metadata consistency (records, pages, data length).
 * 4. Verify communities are sorted by subscriber_count descending.
 */
export async function test_api_community_browse_default(
  connection: api.IConnection,
) {
  const result = await api.functional.communityHub.communities.index(
    connection,
    {
      body: {} satisfies ICommunityHubCommunity.IRequest,
    },
  );
  typia.assert(result);
  const { pagination, data } = result;
  // Verify default pagination values
  TestValidator.equals("default current page", pagination.current, 1);
  TestValidator.equals("default page limit", pagination.limit, 20);
  // Verify pagination metadata consistency
  TestValidator.predicate(
    "total records covers data length",
    pagination.records >= data.length,
  );
  TestValidator.equals(
    "pages computed from records and limit",
    pagination.pages,
    Math.ceil(pagination.records / pagination.limit),
  );
  TestValidator.predicate(
    "data length within page limit",
    data.length <= pagination.limit,
  );
  // When there are more records than one page, the first page should be full
  if (pagination.records > pagination.limit) {
    TestValidator.equals(
      "first page fully populated",
      data.length,
      pagination.limit,
    );
  }
  // Verify communities are sorted by subscriber_count descending (popularity)
  for (let i = 1; i < data.length; i++) {
    TestValidator.predicate(
      "communities sorted by subscriber_count descending",
      data[i - 1].subscriber_count >= data[i].subscriber_count,
    );
  }
}
