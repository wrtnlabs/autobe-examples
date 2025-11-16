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

export async function test_api_community_membership_search_historical_members_by_join_and_end_dates(
  connection: api.IConnection,
) {
  // 1. Prepare actors: platform admin, moderator, and several member users.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates a visibility level to be used by the community.
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(6)}`;
  const visibilityLevelBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Create a member user who will create the community.
  const creatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: "127.0.0.1",
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const creatorAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: creatorJoinBody,
    });
  typia.assert(creatorAuthorized);

  // 4. Creator member user creates a community using the visibility level.
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
      { body: communityCreateBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier should match",
    community.identifier,
    communityIdentifier,
  );

  // 5. Create a community moderator account.
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name(1);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderatorJoinBody = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/register",
    referrer: "https://moderator.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // Ensure moderator can log in again (exercise login endpoint and set auth).
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: "127.0.0.1",
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoggedIn);

  // 6. Create several additional member users that will become community members.
  const memberCount = 5;
  const members: ICommunityPlatformMemberuser.IAuthorized[] = [];

  for (let i = 0; i < memberCount; i++) {
    const joinBody = {
      username: `${RandomGenerator.name(1)}_${i}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      ip: "127.0.0.1",
      href: "https://community.example.com/signup",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest;

    const member: ICommunityPlatformMemberuser.IAuthorized =
      await api.functional.auth.memberUser.join(connection, { body: joinBody });
    typia.assert(member);
    members.push(member);
  }

  // 7. Moderator creates community memberships for each member user.
  const memberships: ICommunityPlatformCommunityMembership[] = [];
  for (const member of members) {
    const createBody = {
      memberuser_id: member.id,
      is_active: true,
    } satisfies ICommunityPlatformCommunityMembership.ICreate;

    const membership: ICommunityPlatformCommunityMembership =
      await api.functional.communityPlatform.communityModerator.communities.memberships.create(
        connection,
        {
          communityIdentifier,
          body: createBody,
        },
      );
    typia.assert(membership);
    memberships.push(membership);
  }

  TestValidator.equals(
    "number of created memberships should equal memberCount",
    memberships.length,
    memberCount,
  );

  // 8. Deactivate a subset of memberships to create historical (inactive) records.
  // We'll deactivate the first 3 memberships and leave the remaining as active.
  const inactiveSlice = memberships.slice(0, 3);
  const activeSlice = memberships.slice(3);
  void activeSlice; // not directly used but kept for clarity

  // Let the backend manage timestamps based on is_active flag updates.
  for (const membership of inactiveSlice) {
    const updateBody = {
      is_active: false,
    } satisfies ICommunityPlatformCommunityMembership.IUpdate;

    const updated: ICommunityPlatformCommunityMembership =
      await api.functional.communityPlatform.communityModerator.communities.memberships.update(
        connection,
        {
          communityIdentifier,
          membershipId: membership.id,
          body: updateBody,
        },
      );
    typia.assert(updated);
  }

  // 9. Fetch memberships for the community to inspect joined_at values.
  const initialSearchBody = {
    is_active: undefined,
    joined_from: null,
    joined_to: null,
    ended_from: null,
    ended_to: null,
    include_deleted: false,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "joined_at" as const,
    sort_direction: "asc" as const,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const allPage: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.memberships.index(
      connection,
      {
        communityIdentifier,
        body: initialSearchBody,
      },
    );
  typia.assert(allPage);

  const byId: Record<string, ICommunityPlatformCommunityMembership.ISummary> =
    {};
  for (const summary of allPage.data) {
    byId[summary.id] = summary;
  }

  const inactiveSummaries: ICommunityPlatformCommunityMembership.ISummary[] =
    [];
  const activeSummaries: ICommunityPlatformCommunityMembership.ISummary[] = [];

  for (const membership of memberships) {
    const summary = byId[membership.id];
    if (!summary) continue;
    if (summary.status === "active") activeSummaries.push(summary);
    else inactiveSummaries.push(summary);
  }

  TestValidator.equals(
    "should have 3 inactive memberships in summaries",
    inactiveSummaries.length,
    inactiveSlice.length,
  );

  // 10. Define a joined_at date range covering all inactive memberships.
  const inactiveJoinedAts = inactiveSummaries.map((s) => s.joined_at).sort();

  const rangeStart = inactiveJoinedAts[0];
  const rangeEnd = inactiveJoinedAts[inactiveJoinedAts.length - 1];

  const historicalSearchBody = {
    is_active: false,
    joined_from: rangeStart,
    joined_to: rangeEnd,
    ended_from: null,
    ended_to: null,
    include_deleted: false,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "joined_at" as const,
    sort_direction: "asc" as const,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const historicalPage: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.memberships.index(
      connection,
      {
        communityIdentifier,
        body: historicalSearchBody,
      },
    );
  typia.assert(historicalPage);

  // 11. Validate that all returned memberships are inactive and within the joined_at range.
  TestValidator.predicate(
    "all returned memberships should be within joined_at range and inactive",
    historicalPage.data.every((summary) => {
      const joined = summary.joined_at;
      return (
        summary.status !== "active" &&
        joined >= rangeStart &&
        joined <= rangeEnd
      );
    }),
  );

  // Validate sorting by joined_at asc.
  const joinedSorted = historicalPage.data.map((s) => s.joined_at);
  const joinedSortedCopy = [...joinedSorted].sort();
  TestValidator.equals(
    "historical memberships should be sorted by joined_at asc",
    joinedSorted,
    joinedSortedCopy,
  );

  // Validate pagination metadata is consistent with the number of matching records
  // in this isolated test (all matching records fit in a single page).
  TestValidator.equals(
    "pagination.records should equal data.length for small dataset",
    historicalPage.pagination.records,
    historicalPage.data.length,
  );

  // 12. Negative case: date range excluding all records.
  const farFuture = "2999-01-01T00:00:00.000Z" as string &
    tags.Format<"date-time">;
  const farFutureEnd = "2999-12-31T23:59:59.000Z" as string &
    tags.Format<"date-time">;

  const emptySearchBody = {
    is_active: false,
    joined_from: farFuture,
    joined_to: farFutureEnd,
    ended_from: null,
    ended_to: null,
    include_deleted: false,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "joined_at" as const,
    sort_direction: "asc" as const,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const emptyPage: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.memberships.index(
      connection,
      {
        communityIdentifier,
        body: emptySearchBody,
      },
    );
  typia.assert(emptyPage);

  TestValidator.equals(
    "no memberships should match far-future range",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "pagination.records should be 0 when there are no results",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0 when there are no results",
    emptyPage.pagination.pages,
    0,
  );
}
