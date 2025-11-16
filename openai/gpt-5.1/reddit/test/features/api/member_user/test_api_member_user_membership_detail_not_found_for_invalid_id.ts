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
 * Ensure member user cannot view community membership detail with invalid
 * membershipId.
 *
 * Business context: A member user should be able to fetch details of their own
 * community memberships but must not be able to infer existence of other
 * memberships by probing arbitrary membershipIds. When a membershipId does not
 * belong to the given member user (or does not exist at all), the system must
 * behave as not-found from that member user's perspective.
 *
 * Steps:
 *
 * 1. Register and authenticate a platform admin.
 * 2. As platform admin, create a community visibility level.
 * 3. Register and authenticate a member user (the owner of the membership).
 * 4. As the member user, create a community using the created visibility level.
 * 5. As the member user, submit a membership request to the community (for
 *    realistic setup, even if not strictly required for membership creation).
 * 6. Register and authenticate a community moderator.
 * 7. As community moderator, create a community membership for the member user in
 *    the community and capture the returned membership id.
 * 8. As the member user, call the membership detail API with the valid membership
 *    id and assert that details are returned and correctly related to the user
 *    and community.
 * 9. As the member user, call the membership detail API again but with a randomly
 *    generated fake membershipId which does not correspond to any membership
 *    for this user, and assert that the call fails (TestValidator.error),
 *    proving that invalid or mismatched membershipIds are treated as
 *    not-found.
 */
export async function test_api_member_user_membership_detail_not_found_for_invalid_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
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

  // 2. Create a community visibility level as platform admin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
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

  // 3. Register and authenticate a member user
  const memberUserJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUser);

  const memberUserId: string & tags.Format<"uuid"> = memberUser.id;

  // 4. As member user, create a community
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 5. As member user, create a membership request for the community
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 6. Register and authenticate a community moderator
  const communityModeratorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModerator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(communityModerator);

  // 7. As community moderator, create a community membership for the member user
  const membershipCreateBody = {
    memberuser_id: memberUserId,
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

  // Assert membership is linked correctly
  TestValidator.equals(
    "membership is for the expected member user",
    membership.memberuser.id,
    memberUserId,
  );
  TestValidator.equals(
    "membership is for the expected community",
    membership.community.id,
    community.id,
  );

  const validMembershipId: string & tags.Format<"uuid"> = membership.id;

  // 8. As member user, retrieve the membership detail using valid membership id
  // Re-authenticate as member user using login to simulate actor switching.
  const memberUserLoginBody = {
    identifier: memberUser.email,
    password: memberUserJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberUserAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberUserLoginBody,
    });
  typia.assert(memberUserAfterLogin);

  const validDetail: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.memberUsers.communityMemberships.at(
      connection,
      {
        memberUserId,
        membershipId: validMembershipId,
      },
    );
  typia.assert(validDetail);

  TestValidator.equals(
    "detail memberuser id matches owner",
    validDetail.memberuser.id,
    memberUserId,
  );
  TestValidator.equals(
    "detail community id matches community",
    validDetail.community.id,
    community.id,
  );

  // 9. Call the detail endpoint with a fake membership id and assert not-found behavior
  const fakeMembershipId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "requesting membership detail with invalid membershipId should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.communityMemberships.at(
        connection,
        {
          memberUserId,
          membershipId: fakeMembershipId,
        },
      );
    },
  );
}
