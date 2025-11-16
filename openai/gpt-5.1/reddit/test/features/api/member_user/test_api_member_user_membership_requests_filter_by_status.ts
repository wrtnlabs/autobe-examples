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
 * Verify that a member user can filter their own community membership requests
 * by status, and that results are scoped to that user only.
 *
 * Business flow (rewritten to match available APIs):
 *
 * 1. Register a platform admin and create a visibility level so that communities
 *    can be created with a known visibilityLevelCode.
 * 2. Register two member users (primary and secondary). The primary user is the
 *    one whose membership requests we will list.
 * 3. As the primary member user, create two communities that both use the created
 *    visibility level.
 * 4. Still as the primary member user, create membership requests in both
 *    communities. Capture the resulting status from one request and use it as
 *    the filter status instead of assuming a literal like "pending".
 * 5. As the secondary member user, create at least one membership request in one
 *    of the communities. This request will share the same status but belongs to
 *    a different user.
 * 6. As the primary member user, call the member-user-scoped PATCH
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/communityMembershipRequests
 *    endpoint with a request body that filters by the captured status and uses
 *    page=1 and a generous limit.
 * 7. Assert that all returned requests:
 *
 *    - Have the requested status value.
 *    - Belong to the primary member user (requester.id matches).
 *    - Do not include the secondary user’s membership requests, even though they
 *         share the same status.
 *    - Have pagination.records equal to data.length.
 */
export async function test_api_member_user_membership_requests_filter_by_status(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates a visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: "Visibility level used for e2e tests.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 2. Register two member users (primary and secondary)
  const memberHref = "https://community.example.com/join";
  const memberReferrer = "https://community.example.com/";

  const primaryJoinBody = {
    username: `primary_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass123!",
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const primaryUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: primaryJoinBody,
    });
  typia.assert(primaryUser);

  const secondaryJoinBody = {
    username: `secondary_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass123!",
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const secondaryUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: secondaryJoinBody,
    });
  typia.assert(secondaryUser);

  // 3. As primary member user, create two communities
  const primaryLoginBody = {
    identifier: primaryJoinBody.email,
    password: primaryJoinBody.password,
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const primaryLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: primaryLoginBody,
    });
  typia.assert(primaryLoginResult);

  const community1Identifier = `comm-${RandomGenerator.alphaNumeric(6)}`;
  const community2Identifier = `comm-${RandomGenerator.alphaNumeric(6)}`;

  const community1Body = {
    identifier: community1Identifier,
    title: "Test Community 1",
    description: "First test community for membership filter.",
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community2Body = {
    identifier: community2Identifier,
    title: "Test Community 2",
    description: "Second test community for membership filter.",
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: community1Body,
      },
    );
  typia.assert(community1);

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: community2Body,
      },
    );
  typia.assert(community2);

  // 4. As primary user, create membership requests in both communities
  const primaryRequest1Body = {
    questionKey: "why_join",
    answerText: "I want to participate in community 1.",
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const primaryRequest1: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community1.identifier,
        body: primaryRequest1Body,
      },
    );
  typia.assert(primaryRequest1);

  const primaryRequest2Body = {
    questionKey: "why_join",
    answerText: "I want to participate in community 2.",
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const primaryRequest2: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community2.identifier,
        body: primaryRequest2Body,
      },
    );
  typia.assert(primaryRequest2);

  // Derive the status to filter by from the first created request
  const filterStatus: string = primaryRequest1.status;

  // 5. As secondary member user, create at least one membership
  // request in one of the communities with the same default status.
  const secondaryLoginBody = {
    identifier: secondaryJoinBody.email,
    password: secondaryJoinBody.password,
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const secondaryLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: secondaryLoginBody,
    });
  typia.assert(secondaryLoginResult);

  const secondaryRequestBody = {
    questionKey: "why_join",
    answerText: "Secondary user requesting membership.",
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const secondaryRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community1.identifier,
        body: secondaryRequestBody,
      },
    );
  typia.assert(secondaryRequest);

  // 6. Switch back to primary member user for listing
  const primaryLoginResult2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: primaryLoginBody,
    });
  typia.assert(primaryLoginResult2);

  // 7. Call the listing endpoint with status filter and pagination
  const listRequestBody = {
    status: filterStatus,
    requester_memberuser_id: null,
    from_requested_at: null,
    to_requested_at: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: null,
    order_direction: null,
  } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest;

  const pageResult: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.memberUser.memberUsers.communityMembershipRequests.index(
      connection,
      {
        memberUserId: primaryUser.id,
        body: listRequestBody,
      },
    );
  typia.assert(pageResult);

  const items = pageResult.data;

  // 8. Assertions
  // Ensure all results have the filtered status.
  for (const item of items) {
    TestValidator.equals(
      "all membership requests match requested status",
      item.status,
      filterStatus,
    );
  }

  // Ensure all results belong to the primary member user.
  for (const item of items) {
    TestValidator.equals(
      "all membership requests belong to primary member user",
      item.requester.id,
      primaryUser.id,
    );
  }

  // Confirm that no secondary user's requests appear.
  for (const item of items) {
    TestValidator.notEquals(
      "no membership request from secondary member user is included",
      item.requester.id,
      secondaryUser.id,
    );
  }

  // Ensure pagination.records equals the number of items in this page,
  // given our controlled dataset and generous limit.
  TestValidator.equals(
    "pagination.records equals number of returned items",
    items.length,
    pageResult.pagination.records,
  );
}
