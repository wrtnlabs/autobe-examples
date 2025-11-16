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
 * Verify that a community moderator can filter membership requests by status
 * using the PATCH listing endpoint.
 *
 * Business workflow:
 *
 * 1. Platform admin joins and creates a visibility level.
 * 2. Member user joins and creates a community using that visibility level.
 * 3. Community moderator joins.
 * 4. Member user creates multiple membership requests for that community.
 * 5. Community moderator lists membership requests with status="pending".
 *
 * Validations:
 *
 * - The listing returns a page structure with valid pagination.
 * - Every returned summary has status equal to "pending".
 * - All returned summaries belong to the created community.
 * - The created membership request IDs are included in the results when they are
 *   pending.
 */
export async function test_api_moderator_membership_requests_filter_by_status(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `vis-${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
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

  // 3. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: RandomGenerator.alphabets(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member user creates a community
  const communityIdentifier = `community-${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
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

  // 5. Community moderator joins
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@moderator.example.com`,
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 6. Switch to member user explicitly by logging in again (session refresh)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 7. Member user creates multiple membership requests for the community
  const membershipRequests: ICommunityPlatformCommunityMembershipRequest[] = [];
  const createCount = 3;

  for (let i = 0; i < createCount; i++) {
    const createBody = {
      questionKey: `q-${RandomGenerator.alphabets(4)}`,
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

  // 8. Switch to community moderator via login
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 9. Moderator lists membership requests filtered by status="pending"
  const requestFilter = {
    status: "pending",
    requester_memberuser_id: null,
    from_requested_at: null,
    to_requested_at: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: null,
    order_direction: null,
  } satisfies ICommunityPlatformCommunityMembershipRequest.IRequest;

  const pageResult: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.membershipRequests.index(
      connection,
      {
        communityIdentifier: community.identifier,
        body: requestFilter,
      },
    );

  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // Basic pagination assertions
  await TestValidator.predicate(
    "current page should be 1",
    async () => pagination.current === 1,
  );

  TestValidator.predicate("limit should be positive", pagination.limit > 0);

  // 10. Validate that all returned summaries are for the same community
  const summaries = pageResult.data;

  for (const summary of summaries) {
    TestValidator.equals(
      "summary community id should match created community",
      summary.community.id,
      community.id,
    );

    TestValidator.equals(
      "summary status should be pending when filter is pending",
      summary.status,
      "pending",
    );
  }

  // 11. Validate that created membership request ids (that are pending) appear
  const returnedIds = new Set(summaries.map((s) => s.id));
  for (const created of membershipRequests) {
    if (created.status === "pending") {
      TestValidator.predicate(
        "pending created membership request should be present in moderator listing",
        returnedIds.has(created.id),
      );
    }
  }
}
