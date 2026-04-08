import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test community ban search by member username or display name.
 *
 * Validates the ban search functionality within a community, including authentication as community owner, community creation, and searching bans with various search parameters. Ensures that the search endpoint correctly handles search queries, pagination, and returns properly structured ban information with member and issuer details.
 *
 * Since ban creation endpoint is not available in the test scope, this test focuses on validating the search endpoint structure, parameter handling, and response format. The test verifies that search queries are accepted and the endpoint returns valid paginated responses with correct metadata.
 *
 * 1. Member registers and authenticates to become community owner.
 * 2. Community is created with unique name and description.
 * 3. Bans index endpoint is called with various search parameters.
 * 4. Validates response structure includes pagination and ban data array.
 * 5. Tests search parameter acceptance with username query.
 * 6. Tests empty search returns all bans without member filtering.
 * 7. Validates pagination metadata reflects result count correctly.
 */
export async function test_api_community_ban_search_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Test ban search with username query
  const searchByUsername =
    await api.functional.redditCommunity.member.communities.bans.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          search: memberAuth.username,
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityBan.IRequest,
      },
    );
  typia.assert(searchByUsername);
  // 4. Test ban search with empty search (returns all bans)
  const searchAll =
    await api.functional.redditCommunity.member.communities.bans.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityBan.IRequest,
      },
    );
  typia.assert(searchAll);
  // 5. Test with status filter for active bans
  const searchActive =
    await api.functional.redditCommunity.member.communities.bans.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityBan.IRequest,
      },
    );
  typia.assert(searchActive);
  // 6. Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination current page is 1",
    searchByUsername.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    searchByUsername.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    searchByUsername.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    searchByUsername.pagination.pages >= 0,
  );
  // 7. Validate search results structure
  TestValidator.predicate(
    "search results contain data array",
    Array.isArray(searchByUsername.data),
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    searchByUsername.data.length <= searchByUsername.pagination.limit,
  );
  // 8. Validate ban record structure when data exists
  if (searchByUsername.data.length > 0) {
    const ban = searchByUsername.data[0];
    TestValidator.predicate(
      "ban has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        ban.id,
      ),
    );
    TestValidator.predicate(
      "ban has member with username",
      ban.member.username !== undefined,
    );
    TestValidator.predicate(
      "ban has issuer with username",
      ban.issuer.username !== undefined,
    );
    TestValidator.predicate(
      "ban has reason string",
      typeof ban.reason === "string",
    );
    TestValidator.predicate(
      "ban has status string",
      typeof ban.status === "string",
    );
  }
  // 9. Validate that different search parameters return consistent structure
  TestValidator.equals(
    "pagination structure consistent across searches",
    {
      current: searchAll.pagination.current,
      limit: searchAll.pagination.limit,
    },
    {
      current: searchActive.pagination.current,
      limit: searchActive.pagination.limit,
    },
  );
}
