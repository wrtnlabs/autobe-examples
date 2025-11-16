import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembershipRequest";

/**
 * Test pagination across multiple membership requests for a member user.
 *
 * Business purpose: Ensure that the member user membership request search
 * endpoint
 * (/communityPlatform/memberUser/memberUsers/{memberUserId}/communityMembershipRequests)
 * correctly paginates membership request summaries when the member user has
 * more requests than fit in a single page, and that responses are scoped to the
 * requesting member user.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate a platform admin.
 * 2. As platform admin, create a community visibility level with a unique code.
 * 3. Register and authenticate a member user; capture the member user id.
 * 4. Switch to member user context (if needed) using the login endpoint.
 * 5. Create several communities (e.g., 3) as the member user, all using the
 *    visibility level code created in step 2.
 * 6. For each community, create multiple membership requests (e.g., 3 per
 *    community) so that total requests > 5 and <= 10.
 * 7. Call the membershipRequests.index endpoint for the member user with page = 1
 *    and limit = 5, capturing page1.
 * 8. Call the same endpoint with page = 2 and limit = 5, capturing page2.
 *
 * Assertions:
 *
 * - Both page1 and page2 conform to
 *   IPageICommunityPlatformCommunityMembershipRequest.ISummary via
 *   typia.assert.
 * - Page1.pagination.current === 1 and page2.pagination.current === 2.
 * - Page1.pagination.limit === 5 and page2.pagination.limit === 5.
 * - Page1.pagination.records === page2.pagination.records and
 *   page1.pagination.pages === page2.pagination.pages.
 * - Combined ids from page1.data and page2.data contain all created membership
 *   request ids; page1 and page2 id sets are disjoint.
 * - Every membership request in both pages has requester.id equal to the member
 *   user id from the join/login step, ensuring no cross-user leakage.
 * - Pagination.records >= totalCreated and pagination.pages >= 1 when records >
 *   0; each page’s data.length <= pagination.limit.
 */
export async function test_api_member_user_membership_requests_pagination_across_multiple_requests(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "Passw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // Optional explicit login to demonstrate actor switching (not strictly required)
  const platformAdminLoginBody = {
    identifier: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Create a community visibility level
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register and authenticate a member user; capture member user id
  const memberUserJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(10)}@member.test.com` as string &
      tags.Format<"email">,
    password: "Passw0rd!",
    ip: "127.0.0.1",
    href: "https://member.test.com/join" as string & tags.Format<"uri">,
    referrer: "https://member.test.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorized);

  const memberUserId: string & tags.Format<"uuid"> = memberUserAuthorized.id;

  // 4. Explicit login as member user to ensure actor context
  const memberUserLoginBody = {
    identifier: memberUserAuthorized.email,
    password: memberUserJoinBody.password,
    ip: "127.0.0.1",
    href: "https://member.test.com/login" as string & tags.Format<"uri">,
    referrer: "https://member.test.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberUserLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberUserLoginBody,
    });
  typia.assert(memberUserLoggedIn);

  // 5. Create several communities as member user
  const communityCount = 3;
  const communities: ICommunityPlatformCommunity[] = [];

  for (let i = 0; i < communityCount; i++) {
    const communityCreateBody = {
      identifier: `community-${RandomGenerator.alphabets(8)}-${i}`,
      title: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      visibilityLevelCode: visibilityCode,
      isNsfw: false,
      primaryTagIds: [],
    } satisfies ICommunityPlatformCommunity.ICreate;

    const community: ICommunityPlatformCommunity =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        {
          body: communityCreateBody,
        },
      );
    typia.assert(community);
    communities.push(community);
  }

  // 6. For each community, create multiple membership requests as member user
  const membershipRequests: ICommunityPlatformCommunityMembershipRequest[] = [];
  const requestsPerCommunity = 3; // total 9 (> 5 and < 11)

  for (const community of communities) {
    for (let i = 0; i < requestsPerCommunity; i++) {
      const createBody = {
        questionKey: `q-${i}`,
        answerText: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

      const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
        await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
          connection,
          {
            communityIdentifier: community.identifier,
            body: createBody,
          },
        );
      typia.assert(membershipRequest);
      membershipRequests.push(membershipRequest);
    }
  }

  const totalCreated = membershipRequests.length;
  TestValidator.predicate(
    "total created membership requests should be greater than 5",
    totalCreated > 5,
  );
  TestValidator.predicate(
    "total created membership requests should be less than or equal to 10",
    totalCreated <= 10,
  );

  // 7. Fetch page 1 with limit = 5
  const limit: number & tags.Type<"int32"> & tags.Minimum<1> = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const page1RequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest;

  const page1: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.memberUser.memberUsers.communityMembershipRequests.index(
      connection,
      {
        memberUserId: memberUserId,
        body: page1RequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityMembershipRequest.ISummary>(
    page1,
  );

  // 8. Fetch page 2 with the same limit
  const page2RequestBody = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest;

  const page2: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.memberUser.memberUsers.communityMembershipRequests.index(
      connection,
      {
        memberUserId: memberUserId,
        body: page2RequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityMembershipRequest.ISummary>(
    page2,
  );

  // Basic pagination metadata equality
  TestValidator.equals(
    "page1 and page2 should report same total records",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "page1 and page2 should report same total pages",
    page1.pagination.pages,
    page2.pagination.pages,
  );

  TestValidator.equals(
    "page1 current page should be 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page2 current page should be 2",
    page2.pagination.current,
    2,
  );

  TestValidator.equals(
    "page1 limit should equal requested limit",
    page1.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "page2 limit should equal requested limit",
    page2.pagination.limit,
    limit,
  );

  // Ensure records reflect at least the number we created
  TestValidator.predicate(
    "total records should be at least totalCreated",
    page1.pagination.records >= totalCreated,
  );

  if (page1.pagination.records > 0) {
    TestValidator.predicate(
      "total pages should be at least 1 when records > 0",
      page1.pagination.pages >= 1,
    );
  }

  // Collect IDs from created requests and from page1+page2
  const createdIds = membershipRequests.map((r) => r.id);

  const page1Ids = page1.data.map((s) => s.id);
  const page2Ids = page2.data.map((s) => s.id);

  // Ensure page sizes do not exceed limit
  TestValidator.predicate(
    "page1 size should not exceed limit",
    page1Ids.length <= page1.pagination.limit,
  );
  TestValidator.predicate(
    "page2 size should not exceed limit",
    page2Ids.length <= page2.pagination.limit,
  );

  // No overlapping IDs between page1 and page2
  const setPage1 = new Set(page1Ids);
  const overlap = page2Ids.some((id) => setPage1.has(id));
  TestValidator.predicate(
    "page1 and page2 should have no overlapping membership request IDs",
    overlap === false,
  );

  // Combined set of ids from page1 and page2 should contain all created ids
  const combinedIds = new Set<string>([...page1Ids, ...page2Ids]);
  const allCovered = createdIds.every((id) => combinedIds.has(id));

  TestValidator.predicate(
    "combined first two pages should cover all created membership requests",
    allCovered,
  );

  // Ensure all requests in both pages belong to the member user
  const allPage1BelongToMember = page1.data.every(
    (summary) => summary.requester.id === memberUserId,
  );
  const allPage2BelongToMember = page2.data.every(
    (summary) => summary.requester.id === memberUserId,
  );

  TestValidator.predicate(
    "all page1 membership requests should belong to the test member user",
    allPage1BelongToMember,
  );
  TestValidator.predicate(
    "all page2 membership requests should belong to the test member user",
    allPage2BelongToMember,
  );
}
