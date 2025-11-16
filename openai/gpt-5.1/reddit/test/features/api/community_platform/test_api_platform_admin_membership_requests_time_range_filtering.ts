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

export async function test_api_platform_admin_membership_requests_time_range_filtering(
  connection: api.IConnection,
) {
  // 1. Register platform admin (auto-authenticated)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platformAdmin, create a visibility level
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register member user and login
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedOnJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedOnJoin);

  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/login-referrer",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedLogin);

  // 4. As memberUser, create a community using the created visibility level code
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 5. As memberUser, create several membership requests for the same community
  const membershipRequests: ICommunityPlatformCommunityMembershipRequest[] = [];

  const membershipRequestBody1 = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;
  const req1: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestBody1,
      },
    );
  typia.assert(req1);
  membershipRequests.push(req1);

  const membershipRequestBody2 = {
    questionKey: "experience",
    answerText: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;
  const req2: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestBody2,
      },
    );
  typia.assert(req2);
  membershipRequests.push(req2);

  const membershipRequestBody3 = {
    questionKey: "goals",
    answerText: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;
  const req3: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestBody3,
      },
    );
  typia.assert(req3);
  membershipRequests.push(req3);

  // 6. Switch authentication back to platformAdmin
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login-referrer",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedLogin);

  // 7. As platformAdmin, list membership requests for the community with no time filter
  const initialFilterBody = {
    status: null,
    requester_memberuser_id: memberAuthorizedLogin.id,
    from_requested_at: null,
    to_requested_at: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: null,
    order_direction: null,
  } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest;

  const initialPage: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.membershipRequests.index(
      connection,
      {
        communityIdentifier: community.identifier,
        body: initialFilterBody,
      },
    );
  typia.assert(initialPage);

  // Ensure at least the three created requests are present for this member
  const allSummaries = initialPage.data;
  TestValidator.predicate(
    "initial listing should contain at least three membership requests for the member",
    allSummaries.length >= 3,
  );

  // Helper to find a summary by id within the initial page
  const findSummaryById = (
    id: string & tags.Format<"uuid">,
  ): ICommunityPlatformCommunityMembershipRequest.ISummary => {
    const summary = allSummaries.find((s) => s.id === id);
    TestValidator.predicate(
      `summary for membership request ${id} must exist in initial listing`,
      summary !== undefined,
    );
    return typia.assert<ICommunityPlatformCommunityMembershipRequest.ISummary>(
      summary!,
    );
  };

  const summary1 = findSummaryById(req1.id);
  const summary2 = findSummaryById(req2.id);
  const summary3 = findSummaryById(req3.id);

  // Sort summaries by created_at (requested_at projection)
  const sortedByCreatedAt = [summary1, summary2, summary3]
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const first = sortedByCreatedAt[0];
  const middle = sortedByCreatedAt[1];
  const last = sortedByCreatedAt[2];

  // 8.a. Filter window covering only the middle request (edge case: exactly one)
  const singleWindowFilterBody = {
    status: null,
    requester_memberuser_id: memberAuthorizedLogin.id,
    from_requested_at: middle.created_at,
    to_requested_at: middle.created_at,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at",
    order_direction: "asc",
  } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest;

  const singleWindowPage: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.membershipRequests.index(
      connection,
      {
        communityIdentifier: community.identifier,
        body: singleWindowFilterBody,
      },
    );
  typia.assert(singleWindowPage);

  // Validate only the middle request is returned
  TestValidator.equals(
    "single-window pagination.records should equal 1",
    singleWindowPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "single-window data length should be 1",
    singleWindowPage.data.length,
    1,
  );

  const onlySummary = singleWindowPage.data[0];
  TestValidator.equals(
    "only returned membership request should be the middle one",
    onlySummary.id,
    middle.id,
  );
  TestValidator.predicate(
    "onlySummary.created_at is within the exact middle.created_at window",
    onlySummary.created_at >= singleWindowFilterBody.from_requested_at! &&
      onlySummary.created_at <= singleWindowFilterBody.to_requested_at!,
  );

  // 8.b. Filter window covering middle and last requests (two in-range)
  const twoWindowFilterBody = {
    status: null,
    requester_memberuser_id: memberAuthorizedLogin.id,
    from_requested_at: middle.created_at,
    to_requested_at: last.created_at,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at",
    order_direction: "asc",
  } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest;

  const twoWindowPage: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.membershipRequests.index(
      connection,
      {
        communityIdentifier: community.identifier,
        body: twoWindowFilterBody,
      },
    );
  typia.assert(twoWindowPage);

  TestValidator.equals(
    "two-window pagination.records should equal 2 (middle and last)",
    twoWindowPage.pagination.records,
    2,
  );

  // Validate that all returned summaries are within [from, to] and belong to the community
  for (const summary of twoWindowPage.data) {
    TestValidator.predicate(
      "summary.created_at within two-window range",
      summary.created_at >= twoWindowFilterBody.from_requested_at! &&
        summary.created_at <= twoWindowFilterBody.to_requested_at!,
    );
    TestValidator.equals(
      "summary.community.id must match community id",
      summary.community.id,
      community.id,
    );
  }

  // Also verify that the first (earliest) request is not included when its created_at < from_requested_at
  const containsFirstInTwoWindow = twoWindowPage.data.some(
    (s) => s.id === first.id,
  );
  TestValidator.predicate(
    "two-window result should not include the earliest request",
    containsFirstInTwoWindow === false,
  );
}
