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
 * Validate pagination and cross-member isolation of admin membership request
 * listing.
 *
 * Business scenario:
 *
 * - A platform administrator should be able to list community membership requests
 *   for a specific member user, with proper pagination.
 * - Requests must be partitioned by the memberUserId path parameter so that data
 *   for different member users is never mixed.
 *
 * Test flow:
 *
 * 1. Register a platform admin and let the SDK attach its token to the connection.
 * 2. As the admin, create a generic account status and a visibility level master
 *    record to be used by communities.
 * 3. Register two different member users using the public join endpoint.
 * 4. As the first member user, create a community.
 * 5. As the second member user, create another community.
 * 6. For each member user, create membership requests into those communities:
 *
 *    - The first member gets more than one page of requests (e.g., 7) so that admin
 *         listing pagination can be exercised.
 *    - The second member gets only a few requests (e.g., 2) to verify behavior when
 *         total records are less than the page size.
 * 7. Switch back to the platform admin actor using login.
 * 8. Call the admin membershipRequests.index endpoint for the first member user
 *    twice: page 1 and page 2 (limit = 5).
 * 9. Call the same endpoint once for the second member user.
 *
 * Assertions:
 *
 * - All responses are structurally valid (typia.assert on every response).
 * - For first member user pages:
 *
 *   - Each summary.requester.id equals the first member's id.
 *   - Page 1 and page 2 contain disjoint membership request ids.
 *   - All ids returned in both pages belong to the set of membership requests we
 *       created for the first member.
 * - For the second member user page:
 *
 *   - Each summary.requester.id equals the second member's id.
 *   - None of the ids returned for the second member appear in the first member's
 *       created id set.
 * - Thus, the memberUserId path parameter is respected as a partition key and
 *   pagination works correctly for a single member's requests.
 */
export async function test_api_platform_admin_membership_requests_pagination_and_cross_member_isolation(
  connection: api.IConnection,
) {
  // 1. Register platform admin
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create account status as admin
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(4)}`,
    label: "Active",
    description: "Active account status for tests",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;
  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusBody },
    );
  typia.assert(accountStatus);

  // 3. Create visibility level as admin
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public",
    description: "Public visibility for test communities",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibility);

  // 4. Register first member user
  const member1JoinBody = {
    username: `member1_${RandomGenerator.alphabets(6)}`,
    email: `${RandomGenerator.alphabets(8)}@member.test.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.local/member/join",
    referrer: "https://app.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const member1Auth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: member1JoinBody,
    });
  typia.assert(member1Auth);

  const member1Id: string & tags.Format<"uuid"> = member1Auth.id;

  // 5. As member1, create a community
  const community1Identifier = `community1_${RandomGenerator.alphabets(6)}`;
  const community1Body = {
    identifier: community1Identifier,
    title: "Member1 Community",
    description: "Test community for member1",
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: community1Body },
    );
  typia.assert(community1);

  // 6. Register second member user
  const member2JoinBody = {
    username: `member2_${RandomGenerator.alphabets(6)}`,
    email: `${RandomGenerator.alphabets(8)}@member.test.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.local/member/join",
    referrer: "https://app.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const member2Auth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: member2JoinBody,
    });
  typia.assert(member2Auth);

  const member2Id: string & tags.Format<"uuid"> = member2Auth.id;

  // 7. As member2 (current token from join), create a community
  const community2Identifier = `community2_${RandomGenerator.alphabets(6)}`;
  const community2Body = {
    identifier: community2Identifier,
    title: "Member2 Community",
    description: "Test community for member2",
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: community2Body },
    );
  typia.assert(community2);

  // 8. Create membership requests as member1
  // Switch back to member1 using login to be explicit
  const member1LoginBody = {
    identifier: member1JoinBody.email,
    password: member1JoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.local/member/login",
    referrer: "https://app.local/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const member1LoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: member1LoginBody,
    });
  typia.assert(member1LoginAuth);

  const member1RequestIds: string[] = [];
  const member1RequestCount = 7; // > page size 5

  for (let i = 0; i < member1RequestCount; i++) {
    const createReqBody = {
      questionKey: `q_${i}`,
      answerText: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

    const created: ICommunityPlatformCommunityMembershipRequest =
      await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
        connection,
        {
          communityIdentifier: community1Identifier,
          body: createReqBody,
        },
      );
    typia.assert(created);
    member1RequestIds.push(created.id);
  }

  // 9. Create membership requests as member2
  const member2LoginBody = {
    identifier: member2JoinBody.email,
    password: member2JoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.local/member/login",
    referrer: "https://app.local/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const member2LoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: member2LoginBody,
    });
  typia.assert(member2LoginAuth);

  const member2RequestIds: string[] = [];
  const member2RequestCount = 2;

  for (let i = 0; i < member2RequestCount; i++) {
    const createReqBody = {
      questionKey: `m2_q_${i}`,
      answerText: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

    const created: ICommunityPlatformCommunityMembershipRequest =
      await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
        connection,
        {
          communityIdentifier: community2Identifier,
          body: createReqBody,
        },
      );
    typia.assert(created);
    member2RequestIds.push(created.id);
  }

  // 10. Switch back to platform admin using login
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const adminLoginAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuth);

  // 11. Admin listing for member1 - page 1
  const pageSize = 5;
  const member1Page1Body = {
    status: null,
    requester_memberuser_id: null,
    from_requested_at: null,
    to_requested_at: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageSize as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: null,
    order_direction: null,
  } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest;

  const member1Page1: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMembershipRequests.index(
      connection,
      {
        memberUserId: member1Id,
        body: member1Page1Body,
      },
    );
  typia.assert(member1Page1);

  TestValidator.equals(
    "member1 page1 pagination.limit should equal requested page size",
    member1Page1.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "member1 page1 pagination.current should be 1",
    member1Page1.pagination.current,
    1,
  );

  const member1Page1Ids = member1Page1.data.map((s) => s.id);

  // Assert all requester ids equal member1Id and none equal member2Id
  for (const summary of member1Page1.data) {
    TestValidator.equals(
      "member1 page1 requester.id must equal member1Id",
      summary.requester.id,
      member1Id,
    );
    TestValidator.notEquals(
      "member1 page1 requester.id must not equal member2Id",
      summary.requester.id,
      member2Id,
    );
    TestValidator.predicate(
      "member1 page1 id should belong to member1 created id set (if created set is non-empty)",
      member1RequestIds.includes(summary.id),
    );
  }

  // 12. Admin listing for member1 - page 2
  const member1Page2Body = {
    status: null,
    requester_memberuser_id: null,
    from_requested_at: null,
    to_requested_at: null,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageSize as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: null,
    order_direction: null,
  } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest;

  const member1Page2: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMembershipRequests.index(
      connection,
      {
        memberUserId: member1Id,
        body: member1Page2Body,
      },
    );
  typia.assert(member1Page2);

  TestValidator.equals(
    "member1 page2 pagination.limit should equal requested page size",
    member1Page2.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "member1 page2 pagination.current should be 2",
    member1Page2.pagination.current,
    2,
  );

  const member1Page2Ids = member1Page2.data.map((s) => s.id);

  for (const summary of member1Page2.data) {
    TestValidator.equals(
      "member1 page2 requester.id must equal member1Id",
      summary.requester.id,
      member1Id,
    );
    TestValidator.notEquals(
      "member1 page2 requester.id must not equal member2Id",
      summary.requester.id,
      member2Id,
    );
    TestValidator.predicate(
      "member1 page2 id should belong to member1 created id set",
      member1RequestIds.includes(summary.id),
    );
  }

  // Ensure page1 and page2 IDs do not overlap
  const overlap = member1Page1Ids.filter((id) => member1Page2Ids.includes(id));
  TestValidator.equals(
    "member1 page1 and page2 should have no overlapping ids",
    overlap.length,
    0,
  );

  // Ensure all returned IDs belong to member1 created set
  const allMember1ReturnedIds = [...member1Page1Ids, ...member1Page2Ids];
  for (const id of allMember1ReturnedIds) {
    TestValidator.predicate(
      "all returned ids for member1 must come from member1 created set",
      member1RequestIds.includes(id),
    );
  }

  // 13. Admin listing for member2 - single page
  const member2Page1Body = {
    status: null,
    requester_memberuser_id: null,
    from_requested_at: null,
    to_requested_at: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageSize as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: null,
    order_direction: null,
  } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest;

  const member2Page1: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMembershipRequests.index(
      connection,
      {
        memberUserId: member2Id,
        body: member2Page1Body,
      },
    );
  typia.assert(member2Page1);

  for (const summary of member2Page1.data) {
    TestValidator.equals(
      "member2 page1 requester.id must equal member2Id",
      summary.requester.id,
      member2Id,
    );
    TestValidator.notEquals(
      "member2 page1 requester.id must not equal member1Id",
      summary.requester.id,
      member1Id,
    );
    TestValidator.predicate(
      "member2 page1 id should belong to member2 created id set",
      member2RequestIds.includes(summary.id),
    );
    TestValidator.predicate(
      "member2 page1 id must not appear in member1 created id set",
      !member1RequestIds.includes(summary.id),
    );
  }
}
