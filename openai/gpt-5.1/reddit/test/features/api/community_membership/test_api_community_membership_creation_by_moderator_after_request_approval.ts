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

export async function test_api_community_membership_creation_by_moderator_after_request_approval(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates a visibility level used by the community.
  const platformAdminHref = "https://admin.example.com/join";
  const platformAdminReferrer = "https://admin.example.com/landing";

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: `admin+${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: platformAdminHref,
    referrer: platformAdminReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(6)}`;

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

  TestValidator.equals(
    "created visibility level code should match request body code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 2. Member user joins and creates a community using the visibility level code.
  const memberUserHref = "https://app.example.com/member/join";
  const memberUserReferrer = "https://app.example.com/landing";

  const memberUserJoinBody = {
    username: `member_${RandomGenerator.alphaNumeric(6)}`,
    email: `member+${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: memberUserHref,
    referrer: memberUserReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberAuthorized);

  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
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
    "community identifier should match requested identifier",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility level code should match created visibility level code",
    community.visibilityLevel.code,
    visibilityLevel.code,
  );

  // 3. Member user submits a membership request for the community.
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
    "membership request requester member user id should match joined member user id",
    membershipRequest.requesterMemberUser.id,
    memberAuthorized.id,
  );

  // 4. Community moderator joins and logs in to act as moderator.
  const moderatorHref = "https://mod.example.com/join";
  const moderatorReferrer = "https://mod.example.com/landing";
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorEmail = `moderator+${RandomGenerator.alphaNumeric(6)}@example.com`;

  const moderatorJoinBody = {
    username: `moderator_${RandomGenerator.alphaNumeric(6)}`,
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(1),
    ip: "127.0.0.1",
    href: moderatorHref,
    referrer: moderatorReferrer,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: "127.0.0.1",
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorReAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorReAuthorized);

  TestValidator.equals(
    "moderator id after login should remain the same as after join",
    moderatorReAuthorized.id,
    moderatorAuthorized.id,
  );

  // 5. Moderator creates an active membership for the requester in the community.
  const membershipCreateBody = {
    memberuser_id: membershipRequest.requesterMemberUser.id,
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

  // 6. Validate membership state and cross-entity consistency.
  TestValidator.equals(
    "membership community id should match the created community id",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership memberuser id should match requester member user id",
    membership.memberuser.id,
    membershipRequest.requesterMemberUser.id,
  );
  TestValidator.predicate(
    "membership should be active",
    membership.is_active === true,
  );
  TestValidator.equals(
    "ended_at should be null for active membership",
    membership.ended_at ?? null,
    null,
  );
  TestValidator.equals(
    "deleted_at should be null for non-deleted membership",
    membership.deleted_at ?? null,
    null,
  );
}
