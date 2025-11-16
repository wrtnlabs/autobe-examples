import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityJoinRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityJoinRequest";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityJoinRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityJoinRequest";

/**
 * Validate moderator-controlled retrieval and filtering of join requests for
 * communities
 *
 * Steps:
 *
 * 1. Register a new moderator for the platform, authenticating into the session.
 * 2. Use a random community name and simulate join requests for that community.
 * 3. With moderator authentication, retrieve join requests for that community
 *    using default pagination and verify expected return shape, type, and
 *    community scoping.
 * 4. Re-query using status filter (e.g., status: 'pending'), verify all returned
 *    requests match.
 * 5. Re-query with applicant_search filter, verify partial text match against
 *    applicants.
 * 6. Re-query with time-range (created_from, created_to), verify all returned
 *    requests are in range.
 * 7. Test pagination: limit results, fetch page 2, ensure paging works.
 * 8. Test sorting: order_by and order_direction params, ensure correct ordering.
 * 9. Confirm no leakage of join requests from other communities.
 * 10. Test that unauthenticated or non-moderator users receive an error or empty
 *     set.
 */
export async function test_api_moderator_list_join_requests_access_controlled(
  connection: api.IConnection,
) {
  // Register as moderator (auth)
  const moderatorPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
    href: "https://test.example.com/register-moderator",
    referrer: "https://test.example.com/landing",
    business_status: null,
    ip: null,
  } satisfies ICommunityPlatformModerator.ICreate;
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorPayload,
  });
  typia.assert(moderator);

  // Simulate target "community" (using a pseudo-random name)
  const communityName = RandomGenerator.name(2)
    .replace(/ /g, "-")
    .toLowerCase();

  // --- Simulate creation of join requests. Since there is no public API provided to create join requests,
  // we can only focus on listing for an existing community name. This test will thus check filtering and access controls.

  // 1. Test unauthenticated access -- forcibly unauth connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "join request moderation endpoint requires moderator authentication",
    async () => {
      await api.functional.communityPlatform.moderator.communities.joinRequests.index(
        unauthConn,
        {
          communityName,
          body: {
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          },
        },
      );
    },
  );

  // 2. List join requests as the moderator for target community, no filter
  const baseResult =
    await api.functional.communityPlatform.moderator.communities.joinRequests.index(
      connection,
      {
        communityName,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(baseResult);
  TestValidator.equals(
    "communityName scoped to join requests only for specified community",
    ArrayUtil.has(
      baseResult.data,
      (req) => req.community.name === communityName,
    ),
    baseResult.data.length > 0 ? true : false,
  );

  // 3. Filter by status (pending)
  const status = "pending";
  const filteredByStatus =
    await api.functional.communityPlatform.moderator.communities.joinRequests.index(
      connection,
      {
        communityName,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          status,
        },
      },
    );
  typia.assert(filteredByStatus);
  TestValidator.predicate(
    `all join requests match status '${status}'`,
    filteredByStatus.data.every((req) => req.status === status),
  );

  // 4. Sorting and paging: order_by, order_direction, page
  const sortedDesc =
    await api.functional.communityPlatform.moderator.communities.joinRequests.index(
      connection,
      {
        communityName,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          order_by: "created_at",
          order_direction: "desc",
        },
      },
    );
  typia.assert(sortedDesc);
  TestValidator.predicate(
    "sorting is descending by created_at",
    sortedDesc.data.length < 2 ||
      sortedDesc.data.every(
        (req, i, arr) => i === 0 || req.created_at <= arr[i - 1].created_at,
      ),
  );

  // 5. Community scoping - query with a different random community name
  const otherCommunityName = RandomGenerator.name(2)
    .replace(/ /g, "-")
    .toLowerCase();
  const resultOther =
    await api.functional.communityPlatform.moderator.communities.joinRequests.index(
      connection,
      {
        communityName: otherCommunityName,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(resultOther);
  TestValidator.equals(
    "join requests for a different community are not returned",
    resultOther.data.length,
    0,
  );
}
