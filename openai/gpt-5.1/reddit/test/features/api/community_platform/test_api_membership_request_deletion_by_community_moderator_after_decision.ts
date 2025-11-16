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

/**
 * Validate deletion of a community membership request by a community moderator.
 *
 * Business context (adapted to available APIs):
 *
 * - A member user can create communities and submit membership requests to them.
 * - Platform admins configure community visibility levels used at community
 *   creation.
 * - Community moderators are authorized to manage membership requests for
 *   communities.
 *
 * This test validates that:
 *
 * 1. A platform admin can create a visibility level master record.
 * 2. A member user can create a community using that visibility level.
 * 3. The same member user can submit a membership request for the community.
 * 4. A community moderator can delete the membership request via the moderator
 *    DELETE endpoint.
 * 5. A second delete attempt for the same membership request fails with an error,
 *    showing the request is no longer deletable.
 *
 * Due to the absence of APIs to transition membership requests into a decided
 * state (approved/rejected) or to read membership state, the original
 * requirement to test deletion behavior after a decision is approximated by
 * testing deletion of a freshly created request and ensuring idempotency
 * semantics (first delete succeeds, second fails).
 */
export async function test_api_membership_request_deletion_by_community_moderator_after_decision(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates a visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@platform-admin.test`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://landing.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinBody,
    },
  );
  typia.assert(platformAdminAuthorized);

  const visibilityCode = `vis_${RandomGenerator.alphabets(6)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code matches",
    visibilityLevel.code,
    visibilityCode,
  );

  // 2. Member user joins, logs in, and creates a community
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member-user.test` as string &
      tags.Format<"email">,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://app.local/join",
    referrer: "https://landing.local/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Explicit login to exercise login flow (even if join already authenticated)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.local/login",
    referrer: "https://landing.local/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized = await api.functional.auth.memberUser.login(
    connection,
    {
      body: memberLoginBody,
    },
  );
  typia.assert(memberLoginAuthorized);

  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
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

  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility level code matches",
    community.visibilityLevel.code,
    visibilityLevel.code,
  );

  // 3. Member user creates a membership request for that community
  const membershipRequestBody = {
    questionKey: "motivation",
    answerText: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);

  TestValidator.equals(
    "membership request community id matches community",
    membershipRequest.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership request requester id matches member user",
    membershipRequest.requesterMemberUser.id,
    memberAuthorized.id,
  );

  // 4. Community moderator joins and logs in
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email:
      `${RandomGenerator.alphabets(8)}@community-moderator.test` as string &
        tags.Format<"email">,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://moderator.local/join",
    referrer: "https://landing.local/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://moderator.local/login",
    referrer: "https://landing.local/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 5. Moderator deletes the membership request
  await api.functional.communityPlatform.communityModerator.communities.membershipRequests.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      membershipRequestId: membershipRequest.id,
    },
  );

  // 6. Second delete attempt should cause an error
  await TestValidator.error(
    "second delete attempt on same membership request should fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.membershipRequests.erase(
        connection,
        {
          communityIdentifier: community.identifier,
          membershipRequestId: membershipRequest.id,
        },
      );
    },
  );
}
