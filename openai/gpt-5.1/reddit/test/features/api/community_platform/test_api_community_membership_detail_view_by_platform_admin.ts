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
 * Validate that a platform administrator can retrieve detailed information
 * about a specific community membership.
 *
 * Business flow:
 *
 * 1. Platform admin signs up (join) – establishes a global administrative actor.
 * 2. Member user signs up (join).
 * 3. Platform admin creates a community visibility level master record.
 * 4. Member user creates a community with that visibility level.
 * 5. Member user submits a membership request for the community.
 * 6. Community moderator signs up (join).
 * 7. Community moderator creates a membership for the member user in the
 *    community.
 * 8. Platform admin calls GET
 *    /communityPlatform/platformAdmin/communities/{communityIdentifier}/memberships/{membershipId}.
 * 9. Validate that the detailed membership payload returned matches the created
 *    membership, focusing on community summary, memberuser summary, active
 *    flag, and timestamps.
 */
export async function test_api_community_membership_detail_view_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin (join immediately authenticates)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.console/signup",
    referrer: "https://landing.page/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Register and authenticate member user
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.local/signup",
    referrer: "https://app.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As platform admin, create a visibility level master record
  // (connection is already authenticated as platformAdmin from join above)
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Public ${RandomGenerator.name(1)}`,
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

  // 4. As member user, create a community using the visibility level
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: "127.0.0.1",
      href: "https://app.local/login",
      referrer: "https://app.local/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
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

  // 5. As member user, submit a membership request for the community
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 6 }),
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

  // Basic sanity check that the request is for our community and member user
  TestValidator.equals(
    "membership request community identifier matches",
    membershipRequest.community.slug,
    community.identifier,
  );
  TestValidator.equals(
    "membership request requester matches member",
    membershipRequest.requesterMemberUser.id,
    memberAuthorized.id,
  );

  // 6. Community moderator signs up
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://moderator.console/signup",
    referrer: "https://moderator.console/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 7. As community moderator, create a membership for the member user
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoinBody.email,
      password: moderatorJoinBody.password,
      ip: "127.0.0.1",
      href: "https://moderator.console/login",
      referrer: "https://moderator.console/landing",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const createdMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(createdMembership);

  TestValidator.equals(
    "created membership community id matches community",
    createdMembership.community.id,
    community.id,
  );
  TestValidator.equals(
    "created membership member id matches member user",
    createdMembership.memberuser.id,
    memberAuthorized.id,
  );
  TestValidator.predicate(
    "created membership must be active",
    createdMembership.is_active === true,
  );

  // 8. Switch back to platform admin (global visibility)
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.console/login",
      referrer: "https://admin.console/landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  // Call the target GET endpoint as platform admin
  const fetchedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.at(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipId: createdMembership.id,
      },
    );
  typia.assert(fetchedMembership);

  // 9. Validate that fetched membership matches the created one from moderator
  TestValidator.equals(
    "membership id must match",
    fetchedMembership.id,
    createdMembership.id,
  );
  TestValidator.equals(
    "membership community id must match",
    fetchedMembership.community.id,
    createdMembership.community.id,
  );
  TestValidator.equals(
    "membership community slug must equal community.identifier",
    fetchedMembership.community.slug,
    community.identifier,
  );
  TestValidator.equals(
    "membership member user id must match",
    fetchedMembership.memberuser.id,
    createdMembership.memberuser.id,
  );
  TestValidator.equals(
    "membership member username must match",
    fetchedMembership.memberuser.username,
    createdMembership.memberuser.username,
  );
  TestValidator.equals(
    "membership active flag must remain true",
    fetchedMembership.is_active,
    createdMembership.is_active,
  );

  // Ensure timestamps are consistent (created_at must not change, updated_at may be >=)
  TestValidator.equals(
    "created_at timestamp should be identical",
    fetchedMembership.created_at,
    createdMembership.created_at,
  );
}
