import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";

/**
 * Verify that a community moderator can search active community memberships
 * with correct filtering, sorting, and pagination.
 *
 * Business workflow:
 *
 * 1. A platform admin joins and creates a dedicated visibility level for the test.
 * 2. A community moderator joins and becomes the actor for membership search.
 * 3. Three member users join the platform.
 * 4. The first member user logs in and creates a community using the created
 *    visibility level.
 * 5. The community moderator logs in and creates three memberships for that
 *    community (two active memberships and one inactive membership).
 * 6. The moderator calls PATCH
 *    /communityPlatform/communityModerator/communities/{communityIdentifier}/memberships
 *    with ICommunityPlatformCommunityMembership.IRequest specifying
 *    is_active=true, pagination parameters (page, limit), and sorting by
 *    joined_at in descending order.
 * 7. The test validates that:
 *
 *    - Only active memberships are returned for is_active=true.
 *    - Joined_at values are ordered in descending sequence.
 *    - Pagination metadata (current, limit, records, pages) is consistent with the
 *         number of active memberships and the requested limit.
 *    - When additional pages exist, there is no duplication of membership IDs across
 *         pages.
 * 8. The moderator also performs a search with is_active=false to validate that
 *    inactive membership(s) can be retrieved and that active memberships are
 *    not present in the result set.
 */
export async function test_api_community_membership_search_active_members_by_moderator(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (and is implicitly logged in)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level as platformAdmin
  const visibilityCode = `vis-${RandomGenerator.alphabets(8)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: "Visibility level for public communities created in tests.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code matches requested code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Create community moderator account
  const communityModeratorEmail = typia.random<string & tags.Format<"email">>();
  const communityModeratorPassword = RandomGenerator.alphaNumeric(12);

  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: communityModeratorEmail,
    password: communityModeratorPassword,
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://community.example.com/mod/join",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 4. Three member users join
  const memberUsers: ICommunityPlatformMemberuser.IAuthorized[] = [];
  const memberPasswords: string[] = [];

  for (let i = 0; i < 3; i++) {
    const password = RandomGenerator.alphaNumeric(12);
    const joinBody = {
      username: `member_${RandomGenerator.alphabets(8)}_${i}`,
      email: typia.random<string & tags.Format<"email">>(),
      password,
      ip: "127.0.0.1",
      href: "https://community.example.com/signup",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest;

    const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
      await api.functional.auth.memberUser.join(connection, {
        body: joinBody,
      });
    typia.assert(memberAuthorized);

    memberUsers.push(memberAuthorized);
    memberPasswords.push(password);
  }

  TestValidator.equals(
    "three member users should be created",
    memberUsers.length,
    3,
  );

  // 5. Use first member user as community creator (explicit login)
  const creator = memberUsers[0];
  const creatorPassword = memberPasswords[0];

  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: creator.email,
      password: creatorPassword,
      ip: "127.0.0.1",
      href: "https://community.example.com/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityIdentifier = `test-community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Membership Search",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier matches requested identifier",
    community.identifier,
    communityIdentifier,
  );

  // 6. Switch to community moderator for membership management
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: communityModeratorEmail,
      password: communityModeratorPassword,
      ip: "127.0.0.1",
      href: "https://community.example.com/mod/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  // 7. Create memberships for each member user
  const membershipRecords: ICommunityPlatformCommunityMembership[] = [];

  for (let i = 0; i < memberUsers.length; i++) {
    const member = memberUsers[i];

    const membershipCreateBody = {
      memberuser_id: member.id,
      is_active: i < 2, // first two active, last one inactive
    } satisfies ICommunityPlatformCommunityMembership.ICreate;

    const membership: ICommunityPlatformCommunityMembership =
      await api.functional.communityPlatform.communityModerator.communities.memberships.create(
        connection,
        {
          communityIdentifier: community.identifier,
          body: membershipCreateBody,
        },
      );
    typia.assert(membership);
    membershipRecords.push(membership);
  }

  TestValidator.equals(
    "three membership records should be created",
    membershipRecords.length,
    3,
  );

  const activeMemberships = membershipRecords.filter(
    (m) => m.is_active === true,
  );
  const inactiveMemberships = membershipRecords.filter(
    (m) => m.is_active === false,
  );

  TestValidator.equals(
    "two memberships should be active",
    activeMemberships.length,
    2,
  );
  TestValidator.equals(
    "one membership should be inactive",
    inactiveMemberships.length,
    1,
  );

  // 8. Search active memberships with pagination and sorting
  const limit = 2;
  const page1 = 1;

  const searchRequestBody = {
    is_active: true,
    joined_from: null,
    joined_to: null,
    ended_from: null,
    ended_to: null,
    include_deleted: false,
    page: page1,
    limit,
    sort_by: "joined_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const pageResult1: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.memberships.index(
      connection,
      {
        communityIdentifier: community.identifier,
        body: searchRequestBody,
      },
    );
  typia.assert(pageResult1);

  const pagination1: IPage.IPagination = pageResult1.pagination;
  const data1: ICommunityPlatformCommunityMembership.ISummary[] =
    pageResult1.data;

  // Basic pagination assertions
  TestValidator.equals(
    "page 1 pagination current should match requested page",
    pagination1.current,
    page1,
  );
  TestValidator.equals(
    "page 1 pagination limit should match requested limit",
    pagination1.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination.records should be at least number of active memberships",
    pagination1.records >= activeMemberships.length,
  );
  TestValidator.predicate(
    "page 1 should contain at least one membership",
    data1.length > 0,
  );
  TestValidator.predicate(
    "page 1 should not exceed requested limit",
    data1.length <= limit,
  );

  // Validate that all returned memberships are active
  for (const summary of data1) {
    TestValidator.equals(
      "summary status for active search should be 'active'",
      summary.status,
      "active",
    );
  }

  // Validate joined_at descending order
  for (let i = 1; i < data1.length; i++) {
    const prev = data1[i - 1].joined_at;
    const curr = data1[i].joined_at;
    TestValidator.predicate(
      "joined_at should be in descending order on page 1",
      prev >= curr,
    );
  }

  // 9. Optional: second page when available
  if (pagination1.pages > 1) {
    const page2Index = 2;
    const searchRequestBodyPage2 = {
      is_active: true,
      joined_from: null,
      joined_to: null,
      ended_from: null,
      ended_to: null,
      include_deleted: false,
      page: page2Index,
      limit,
      sort_by: "joined_at",
      sort_direction: "desc",
    } satisfies ICommunityPlatformCommunityMembership.IRequest;

    const pageResult2: IPageICommunityPlatformCommunityMembership.ISummary =
      await api.functional.communityPlatform.communityModerator.communities.memberships.index(
        connection,
        {
          communityIdentifier: community.identifier,
          body: searchRequestBodyPage2,
        },
      );
    typia.assert(pageResult2);

    const pagination2: IPage.IPagination = pageResult2.pagination;
    const data2: ICommunityPlatformCommunityMembership.ISummary[] =
      pageResult2.data;

    TestValidator.equals(
      "page 2 pagination current should be 2",
      pagination2.current,
      page2Index,
    );

    // Ensure no duplicated membership ids between page 1 and page 2
    const page1Ids = data1.map((m) => m.id);
    const page2Ids = data2.map((m) => m.id);

    for (const id of page2Ids) {
      TestValidator.predicate(
        "membership on page 2 should not duplicate page 1 entries",
        page1Ids.indexOf(id) === -1,
      );
    }
  }

  // 10. Optional: search inactive memberships
  const inactiveSearchBody = {
    is_active: false,
    joined_from: null,
    joined_to: null,
    ended_from: null,
    ended_to: null,
    include_deleted: false,
    page: 1,
    limit: 5,
    sort_by: "joined_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const inactivePage: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.memberships.index(
      connection,
      {
        communityIdentifier: community.identifier,
        body: inactiveSearchBody,
      },
    );
  typia.assert(inactivePage);

  for (const summary of inactivePage.data) {
    TestValidator.predicate(
      "inactive search should not return active memberships",
      summary.status !== "active",
    );
  }
}
