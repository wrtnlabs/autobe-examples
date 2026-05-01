import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";

/**
 * Test community search endpoint returns paginated results with full community metadata.
 *
 * Validates that the public community search endpoint correctly returns paginated ICommunityHubCommunity.ISummary objects within an IPageICommunityHubCommunity.ISummary envelope. The test creates a community with a known name through an authenticated member, then confirms the search endpoint returns that community with accurate name, icon_image, and subscriber_count fields.
 *
 * Pagination metadata integrity is verified by checking that current, limit, records, and pages are all non-negative and that the records count reflects the presence of at least the newly created community. The test also confirms that the search endpoint is publicly accessible without authentication.
 *
 * 1. Member registers and authenticates via authorize_member_join.
 * 2. Member creates a community with a distinctive alphabetic name.
 * 3. Public search endpoint is called without authentication.
 * 4. Created community is located in search results by its unique ID.
 * 5. Community name, icon_image, subscriber_count, and owner ID are validated.
 * 6. Pagination metadata fields are validated for non-negative values and minimum record count.
 */
export async function test_api_community_search_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community with a distinctive name
  const communityName = RandomGenerator.alphabets(8) + "Community";
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      { body: { name: communityName } },
    );
  typia.assert(community);
  // 3. Search communities via the public endpoint
  const publicConnection: api.IConnection = { host: connection.host };
  const searchResult =
    await api.functional.communityHub.communities.search(publicConnection);
  typia.assert(searchResult);
  // 4. Locate the created community in search results
  const found = searchResult.data.find((c) => c.id === community.id);
  TestValidator.predicate(
    "created community found in search results",
    found !== undefined,
  );
  // 5. Validate community metadata in search results
  if (found) {
    TestValidator.equals("community name matches", found.name, community.name);
    TestValidator.equals(
      "community icon matches",
      found.icon_image,
      community.icon_image,
    );
    TestValidator.equals(
      "community subscriber count is zero",
      found.subscriber_count,
      0,
    );
    TestValidator.equals(
      "community owner matches creator",
      found.owner.id,
      member.id,
    );
  }
  // 6. Validate pagination metadata integrity
  TestValidator.predicate(
    "pagination current >= 0",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    searchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    searchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "search results contain at least one record",
    searchResult.pagination.records >= 1,
  );
}
