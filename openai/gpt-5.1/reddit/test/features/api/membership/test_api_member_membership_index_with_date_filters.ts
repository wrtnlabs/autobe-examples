import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";

export async function test_api_member_membership_index_with_date_filters(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a platformAdmin to configure visibility levels
  const adminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: `${RandomGenerator.alphabets(8)}@example.com`,
        password: "AdminPass123!",
        displayName: RandomGenerator.name(),
        ip: RandomGenerator.alphabets(8),
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(adminJoin);

  // 2. As platformAdmin, create a visibility level for test communities
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Public ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register (join) a new member user
  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: `${RandomGenerator.alphabets(10)}@member.test`,
        password: "MemberPass123!",
        ip: RandomGenerator.alphabets(8),
        href: "https://app.example.com/join",
        referrer: "https://app.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);
  const memberUserId = memberJoin.id;

  // 4. Explicit login as the same member user (fresh session)
  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberJoin.email,
        password: "MemberPass123!",
        ip: RandomGenerator.alphabets(8),
        href: "https://app.example.com/login",
        referrer: "https://app.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLogin);

  // 5. As memberUser, create a community using the visibility level code
  const communityIdentifier = `community-${RandomGenerator.alphabets(6)}`;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: `Test Community ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. As memberUser, submit multiple membership requests to create memberships
  const requestCount = 5;
  const membershipRequests: ICommunityPlatformCommunityMembershipRequest[] = [];
  for (let i = 0; i < requestCount; ++i) {
    const req: ICommunityPlatformCommunityMembershipRequest =
      await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
        connection,
        {
          communityIdentifier,
          body: {
            questionKey: `reason-${i}`,
            answerText: RandomGenerator.paragraph({ sentences: 4 }),
          } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate,
        },
      );
    typia.assert(req);
    membershipRequests.push(req);
  }
  TestValidator.equals(
    "membership request count",
    membershipRequests.length,
    requestCount,
  );

  // 7. First unfiltered index call to capture all memberships for this member
  const fullPage: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.memberUser.memberUsers.communityMemberships.index(
      connection,
      {
        memberUserId,
        body: {
          is_active: undefined,
          joined_from: null,
          joined_to: null,
          ended_from: null,
          ended_to: null,
          include_deleted: false,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
          sort_by: "joined_at",
          sort_direction: "desc",
        } satisfies ICommunityPlatformCommunityMembership.IRequest,
      },
    );
  typia.assert(fullPage);

  const allMemberships = fullPage.data;
  TestValidator.predicate(
    "at least one membership should exist for the member user",
    allMemberships.length > 0,
  );

  // Sort in-memory by joined_at ascending to construct a joined_at window
  const sortedByJoinedAsc = [...allMemberships].sort((a, b) =>
    a.joined_at.localeCompare(b.joined_at),
  );

  const first = sortedByJoinedAsc[0];
  const last = sortedByJoinedAsc[sortedByJoinedAsc.length - 1];
  const middle = sortedByJoinedAsc[Math.floor(sortedByJoinedAsc.length / 2)];

  // Build a filter window that should include the middle element
  const joinedFrom = first.joined_at;
  const joinedTo = middle.joined_at;

  // 8. Call index again with joined_at range and sort options
  const filteredPage: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.memberUser.memberUsers.communityMemberships.index(
      connection,
      {
        memberUserId,
        body: {
          is_active: undefined,
          joined_from: joinedFrom,
          joined_to: joinedTo,
          ended_from: null,
          ended_to: null,
          include_deleted: false,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
          sort_by: "joined_at",
          sort_direction: "desc",
        } satisfies ICommunityPlatformCommunityMembership.IRequest,
      },
    );
  typia.assert(filteredPage);

  const filteredMemberships = filteredPage.data;

  // 9. Assert that every returned membership is within [joinedFrom, joinedTo]
  for (const m of filteredMemberships) {
    TestValidator.predicate(
      "filtered membership joined_at should be within range",
      m.joined_at >= joinedFrom && m.joined_at <= joinedTo,
    );
  }

  // 10. Assert that at least one membership in the filtered set matches the middle element
  const hasMiddle = filteredMemberships.some(
    (m) => m.id === middle.id && m.joined_at === middle.joined_at,
  );
  TestValidator.predicate(
    "filtered result should contain the middle membership",
    hasMiddle,
  );

  // 11. Assert that no membership outside the window appears in the filtered results
  const outside = sortedByJoinedAsc.filter(
    (m) => m.joined_at < joinedFrom || m.joined_at > joinedTo,
  );
  for (const m of outside) {
    const exists = filteredMemberships.some((x) => x.id === m.id);
    TestValidator.predicate(
      "membership outside the window should not be in filtered results",
      exists === false,
    );
  }

  // 12. Verify pagination metadata is consistent with the filtered result size
  TestValidator.equals(
    "pagination.current should be 1",
    filteredPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination.limit should be >= filtered size",
    filteredPage.pagination.limit >= filteredMemberships.length,
  );
  TestValidator.predicate(
    "pagination.records should be >= filtered size",
    filteredPage.pagination.records >= filteredMemberships.length,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 1 when records > 0",
    filteredMemberships.length === 0
      ? filteredPage.pagination.pages >= 0
      : filteredPage.pagination.pages >= 1,
  );

  // 13. Verify sorting order: joined_at desc
  for (let i = 1; i < filteredMemberships.length; ++i) {
    const prev = filteredMemberships[i - 1];
    const curr = filteredMemberships[i];
    TestValidator.predicate(
      "memberships should be ordered by joined_at desc",
      prev.joined_at >= curr.joined_at,
    );
  }
}
