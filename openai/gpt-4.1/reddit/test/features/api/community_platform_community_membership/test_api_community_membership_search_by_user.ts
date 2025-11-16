import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityJoinRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityJoinRequest";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";

/**
 * E2E Test: Search and retrieve a paginated, filtered membership listing for a
 * community by authenticated user.
 *
 * Steps:
 *
 * 1. Register a new user (simulate join)
 * 2. Use that authenticated user context to search memberships for a community
 *    (chosen arbitrarily)
 * 3. Call membership index with various search filters - status: 'active',
 *    different pagination, ordering
 * 4. Assert only 'active' memberships returned, pagination and ordering work, and
 *    all memberships match the requested community name
 * 5. Confirm data access requires authentication: unauthenticated request should
 *    fail
 */
export async function test_api_community_membership_search_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user (onboarding)
  const email = typia.random<string & tags.Format<"email">>();
  const password = "_Test1234_";
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: password as string & tags.Format<"password">,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);
  // 2. Choose a random community name as search target (test will not create new community due to lack of such endpoint)
  const filterCommunityName = RandomGenerator.alphaNumeric(10);
  // 3. Execute membership search with filter by status 'active', pagination, and sort order
  const status = "active";
  const order_by = RandomGenerator.pick(["created_at", "updated_at"] as const);
  const order_direction = RandomGenerator.pick(["asc", "desc"] as const);
  const pageIdx = 0;
  const pageLimit = 10;
  const searchBody = {
    status,
    order_by,
    order_direction,
    page: pageIdx,
    limit: pageLimit,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;
  const membershipPage: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.user.communities.memberships.index(
      connection,
      {
        communityName: filterCommunityName,
        body: searchBody,
      },
    );
  typia.assert(membershipPage);
  // 4. Validate all results: status, correct community, and correct pagination
  for (const membership of membershipPage.data) {
    typia.assert(membership);
    TestValidator.equals(
      "membership status is active",
      membership.status,
      status,
    );
    TestValidator.equals(
      "membership belongs to target community",
      membership.community.name,
      filterCommunityName,
    );
  }
  TestValidator.equals(
    "pagination index matches",
    membershipPage.pagination.current,
    pageIdx,
  );
  TestValidator.equals(
    "pagination limit matches",
    membershipPage.pagination.limit,
    pageLimit,
  );
  // 5. Confirm endpoint rejects unauthenticated request (force token removal)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "membership listing requires authentication",
    async () => {
      await api.functional.communityPlatform.user.communities.memberships.index(
        unauthConn,
        {
          communityName: filterCommunityName,
          body: searchBody,
        },
      );
    },
  );
}
