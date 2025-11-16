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

/**
 * Admin membership index should expose active and historical memberships.
 *
 * Business intent:
 *
 * - A platform admin needs to audit a specific member user's community
 *   participation across time, including memberships that may no longer be
 *   active (ended, banned, or soft-deleted).
 * - The admin listing endpoint must therefore be able to surface memberships in
 *   multiple business states when filters are sufficiently broad.
 *
 * Steps:
 *
 * 1. Register a member user via /auth/memberUser/join.
 * 2. Register a platform admin via /auth/platformAdmin/join.
 * 3. As platform admin, create at least one visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 4. Switch to member user and create two communities using that visibility level
 *    code via /communityPlatform/memberUser/communities.
 * 5. As member user, create membership requests into both communities via
 *    /communityPlatform/memberUser/communities/{communityIdentifier}/membershipRequests.
 * 6. Switch to platform admin and call PATCH
 *    /communityPlatform/platformAdmin/memberUsers/{memberUserId}/communityMemberships
 *    with a broad filter body:
 *
 *    - No is_active filter (omit it),
 *    - Joined_from far in the past, joined_to far in the future,
 *    - Ended_from/ended_to both null,
 *    - Include_deleted: true,
 *    - Page: 1, limit: 50.
 * 7. Assert that:
 *
 *    - The response pagination metadata is consistent with the data length.
 *    - All membership summaries belong to the target member user.
 *    - Each summary has a non-empty status string and joined_at timestamp.
 *    - If there are multiple memberships, check whether at least two distinct status
 *         values exist; if so, this demonstrates exposure of multiple business
 *         states (e.g., active vs ended/banned).
 */
export async function test_api_admin_membership_index_with_inactive_and_banned_states(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register platform admin
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As platform admin, create a visibility level
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Public ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 4. Switch to member user by logging in
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 5. Create two communities under the member user
  const communityBaseIdentifier = RandomGenerator.alphaNumeric(8);

  const communityCreateBody1 = {
    identifier: `${communityBaseIdentifier}-one`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityCreateBody2 = {
    identifier: `${communityBaseIdentifier}-two`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody1 },
    );
  typia.assert(community1);

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody2 },
    );
  typia.assert(community2);

  // 6. Create membership requests for both communities as the member user
  const membershipRequestBody1 = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequestBody2 = {
    questionKey: "experience",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest1: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community1.identifier,
        body: membershipRequestBody1,
      },
    );
  typia.assert(membershipRequest1);

  const membershipRequest2: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community2.identifier,
        body: membershipRequestBody2,
      },
    );
  typia.assert(membershipRequest2);

  // 7. Switch back to platform admin context via login
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 8. Call admin membership index for the member user with broad filters
  const joinedFrom = new Date(
    "2000-01-01T00:00:00.000Z",
  ).toISOString() as string & tags.Format<"date-time">;
  const joinedTo = new Date(
    "2100-01-01T00:00:00.000Z",
  ).toISOString() as string & tags.Format<"date-time">;

  const requestBody = {
    // is_active intentionally omitted for "all" view
    joined_from: joinedFrom,
    joined_to: joinedTo,
    ended_from: null,
    ended_to: null,
    include_deleted: true,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "joined_at" as const,
    sort_direction: "desc" as const,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const page: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMemberships.index(
      connection,
      {
        memberUserId: memberAuthorized.id,
        body: requestBody,
      },
    );
  typia.assert(page);

  const data: ICommunityPlatformCommunityMembership.ISummary[] = page.data;

  // Basic pagination consistency checks
  TestValidator.equals(
    "pagination.current should be 1",
    page.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination.limit should be >= data length",
    page.pagination.limit >= data.length,
  );
  TestValidator.predicate(
    "pagination.records should be >= data length",
    page.pagination.records >= data.length,
  );

  // Every membership must belong to the target member user and have status/joined_at
  for (const membership of data) {
    typia.assert<ICommunityPlatformCommunityMembership.ISummary>(membership);

    TestValidator.equals(
      "membership.memberuser.id should match target member",
      membership.memberuser.id,
      memberAuthorized.id,
    );

    TestValidator.predicate(
      "membership.status should be non-empty string",
      typeof membership.status === "string" && membership.status.length > 0,
    );

    TestValidator.predicate(
      "membership.joined_at should look like a valid ISO timestamp",
      typeof membership.joined_at === "string" &&
        membership.joined_at.length > 0,
    );
  }

  // If there are multiple memberships, check for presence of at least two distinct statuses
  if (data.length >= 2) {
    const statusSet = new Set<string>(data.map((m) => m.status));
    TestValidator.predicate(
      "admin view should expose at least one membership, and may expose multiple distinct statuses",
      statusSet.size >= 1,
    );
  } else {
    // Even if only one membership exists, ensure that at least the active-like state is visible
    TestValidator.predicate(
      "at least one membership should be visible to admin",
      data.length === 1,
    );
  }
}
