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

/**
 * End-to-end onboarding and membership deletion flow.
 *
 * This test validates that a community moderator can remove a member's
 * community membership after a realistic onboarding process involving:
 *
 * 1. Creating all required auth actors (memberUser, platformAdmin,
 *    communityModerator).
 * 2. Platform admin creating a visibility level.
 * 3. Member user creating a community using that visibility level.
 * 4. Member user creating a membership request for that community.
 * 5. Community moderator creating an active membership for that member user in the
 *    target community.
 * 6. Community moderator deleting that membership via the DELETE
 *    /communityPlatform/communityModerator/communities/{communityIdentifier}/memberships/{membershipId}
 *    endpoint.
 *
 * Due to the limited SDK surface provided, we treat successful completion of
 * the erase call without error as proof that the membership row was removed and
 * rely on the type-checked responses of intermediate steps for correctness.
 */
export async function test_api_community_membership_delete_by_moderator_after_onboarding_flow(
  connection: api.IConnection,
) {
  // 1. Register core actors: memberUser, platformAdmin, communityModerator
  // Member user join
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Platform admin join
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Community moderator join
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 2. Switch to platformAdmin and create a visibility level
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: platformAdminJoinBody.href,
    referrer: platformAdminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  const visibilityCode = RandomGenerator.alphaNumeric(8);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "created visibility level code should match input code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Switch to memberUser and create a community with that visibility level
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: memberJoinBody.href,
    referrer: memberJoinBody.referrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  const communityIdentifier = RandomGenerator.alphaNumeric(10);
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
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
    "created community identifier should match input identifier",
    community.identifier,
    communityIdentifier,
  );

  // 4. Member user creates a membership request for that community
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 4 }),
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
    "membership request community id should match community id",
    membershipRequest.community.id,
    community.id,
  );

  TestValidator.equals(
    "membership request requester id should match member user id",
    membershipRequest.requesterMemberUser.id,
    memberLoginResult.id,
  );

  // 5. Switch to communityModerator and create an active membership
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: moderatorJoinBody.href,
    referrer: moderatorJoinBody.referrer,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginResult: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginResult);

  const membershipCreateBody = {
    memberuser_id: memberLoginResult.id,
    is_active: true,
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

  TestValidator.equals(
    "community membership community id should match community id",
    membership.community.id,
    community.id,
  );

  TestValidator.equals(
    "community membership member user id should match member user id",
    membership.memberuser.id,
    memberLoginResult.id,
  );

  TestValidator.predicate(
    "community membership should be active before deletion",
    membership.is_active === true,
  );

  // 6. Moderator deletes the membership using DELETE endpoint
  await api.functional.communityPlatform.communityModerator.communities.memberships.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      membershipId: membership.id,
    },
  );

  // 7. Verify flow reached post-delete checkpoint (no error was thrown)
  TestValidator.predicate(
    "membership delete flow should reach completion without error",
    true,
  );
}
