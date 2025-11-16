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
 * Verify that a platform admin can filter and page a member user's community
 * membership requests using status and requested_at time window, and that the
 * response is suitable for audit-style queries.
 *
 * Flow:
 *
 * 1. As a platform admin, join (register) and become authenticated.
 * 2. As the same platform admin, create at least one account status; this
 *    satisfies platform prerequisites but is not directly used later.
 * 3. As a member user, join and become authenticated; capture the memberUserId.
 * 4. Still as platform admin, create a visibility level; capture its code so that
 *    communities can use it.
 * 5. Log in as the member user; create two communities using the visibility level
 *    code.
 * 6. For each community, create a membership request as that member user.
 * 7. Switch back to platform admin authentication.
 * 8. Call the PATCH admin endpoint for this member user with a request body that
 *    filters by:
 *
 *    - Status: the observed status of the created membership requests (discovered by
 *         an initial unfiltered call),
 *    - From_requested_at / to_requested_at: a time window that includes the
 *         requests.
 *    - Page / limit: set limit high enough (e.g., 10) and page=1 to ensure both
 *         requests fall into the same page.
 * 9. Validate that all returned membership request summaries:
 *
 *    - Have requester.id equal to the member user's id,
 *    - Have status equal to the filtered status value,
 *    - Have created_at within the selected time window.
 * 10. Validate that pagination metadata matches the number of summaries.
 */
export async function test_api_platform_admin_membership_requests_filter_and_audit(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.alphabets(8),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create at least one account status (prerequisite master data)
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(5)}`,
    label: "Active",
    description: "Active account status for testing membership filters",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusBody,
      },
    );
  typia.assert(accountStatus);

  // 3. Register a member user and capture its id
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);
  const memberUserId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 4. Create a visibility level as platform admin
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: "Visibility level for membership request filtering test",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 5. Login as the member user to create communities and membership requests
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 6. Create two communities using the created visibility level code
  const communityCreateBody1 = {
    identifier: `community_${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody1,
      },
    );
  typia.assert(community1);

  const communityCreateBody2 = {
    identifier: `community_${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody2,
      },
    );
  typia.assert(community2);

  // 7. Create membership requests for each community as the member user
  const membershipCreateBody1 = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest1: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community1.identifier,
        body: membershipCreateBody1,
      },
    );
  typia.assert(membershipRequest1);

  const membershipCreateBody2 = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest2: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community2.identifier,
        body: membershipCreateBody2,
      },
    );
  typia.assert(membershipRequest2);

  // Capture requestedAt timestamps from the detailed entities to build a
  // tight time window (assuming requestedAt is within the returned entity).
  const requestedAt1 = membershipRequest1.requestedAt;
  const requestedAt2 = membershipRequest2.requestedAt;

  // Determine min/max requestedAt for the created requests
  const fromRequestedAt =
    requestedAt1 < requestedAt2 ? requestedAt1 : requestedAt2;
  const toRequestedAt =
    requestedAt1 > requestedAt2 ? requestedAt1 : requestedAt2;

  // 8. Switch back to platform admin authentication for audit-style query
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 9. Discover actual status string by doing an unfiltered query for the member.
  const initialIndexResponse: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMembershipRequests.index(
      connection,
      {
        memberUserId: memberUserId,
        body: {
          status: null,
          requester_memberuser_id: null,
          from_requested_at: null,
          to_requested_at: null,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          order_by: null,
          order_direction: null,
        } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest,
      },
    );
  typia.assert(initialIndexResponse);

  TestValidator.predicate(
    "initial index should contain at least one membership request",
    initialIndexResponse.pagination.records > 0,
  );

  // Pick the status of the membership requests we just created. We
  // prefer a record matching one of our request ids so that we know the
  // status is exactly what those have.
  const initialSummaryMatching = initialIndexResponse.data.find(
    (s) => s.id === membershipRequest1.id || s.id === membershipRequest2.id,
  );

  TestValidator.predicate(
    "initial index should contain at least one of the created membership requests",
    () => initialSummaryMatching !== undefined,
  );

  const filterStatus = initialSummaryMatching
    ? initialSummaryMatching.status
    : initialIndexResponse.data[0]!.status;

  // 10. Call admin index with filters: status + requested_at window + pagination
  const filteredRequestBody = {
    status: filterStatus,
    requester_memberuser_id: memberUserId,
    from_requested_at: fromRequestedAt,
    to_requested_at: toRequestedAt,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: null,
    order_direction: null,
  } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest;

  const filteredResponse: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMembershipRequests.index(
      connection,
      {
        memberUserId: memberUserId,
        body: filteredRequestBody,
      },
    );
  typia.assert(filteredResponse);

  // Validate pagination metadata is consistent
  TestValidator.predicate(
    "pagination.records should be >= number of returned data items",
    filteredResponse.pagination.records >= filteredResponse.data.length,
  );

  if (filteredResponse.pagination.records === 0) {
    // If no records came back, at least ensure data is empty and pages is 0
    TestValidator.equals(
      "no data when records is zero",
      filteredResponse.data.length,
      0,
    );
    TestValidator.equals(
      "no pages when records is zero",
      filteredResponse.pagination.pages,
      0,
    );
    return;
  }

  // If we have records, each returned summary must match the filter criteria
  for (const summary of filteredResponse.data) {
    // requester.id must equal memberUserId
    TestValidator.equals(
      "summary requester id matches memberUserId",
      summary.requester.id,
      memberUserId,
    );

    // status must equal filterStatus
    TestValidator.equals(
      "summary status matches filtered status",
      summary.status,
      filterStatus,
    );

    // created_at (requestedAt proxy) must be within [fromRequestedAt, toRequestedAt]
    TestValidator.predicate(
      "summary created_at within requested_at window",
      summary.created_at >= fromRequestedAt &&
        summary.created_at <= toRequestedAt,
    );
  }

  // Additionally, confirm that at least one of the two known requests
  // is present in the filtered subset when there are any records
  const filteredIds = filteredResponse.data.map((s) => s.id);

  TestValidator.predicate(
    "filtered response includes at least one of the created membership requests",
    () =>
      filteredIds.includes(membershipRequest1.id) ||
      filteredIds.includes(membershipRequest2.id),
  );
}
