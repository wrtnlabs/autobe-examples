import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that a community moderator cannot fetch membership request details for
 * a request belonging to a different community by manipulating the
 * `communityIdentifier` path parameter.
 *
 * Business context:
 *
 * - Communities are created by member users and are scoped by a human-readable
 *   `identifier`.
 * - Membership requests belong to a specific community; moderators are assigned
 *   per-community via moderator assignments.
 * - The moderator detail endpoint for membership requests is scoped by both
 *   `communityIdentifier` and `membershipRequestId` and must ensure that the
 *   request actually belongs to that community.
 *
 * Flow:
 *
 * 1. Register a platform admin and keep credentials to re-login later.
 * 2. As platform admin, create a visibility level to be used by both Community A
 *    and Community B.
 * 3. Register a member user (the requester/creator of communities).
 * 4. As that member user, create Community A.
 * 5. As the same member user, create Community B.
 * 6. As the member user, create a membership request in Community B and capture
 *    its `id`.
 * 7. Register a community moderator account.
 * 8. As platform admin, assign this moderator only to Community A.
 * 9. As the moderator, attempt to GET the membership request using Community A's
 *    identifier with the membership request id that actually belongs to
 *    Community B.
 *
 * Expectation:
 *
 * - The detail endpoint must not return the membership request and instead fail
 *   (for example, with not-found) so that cross-community leakage is
 *   prevented.
 * - The test asserts that an error is thrown for the mismatched community.
 */
export async function test_api_community_moderator_membership_request_detail_not_found_for_other_community(
  connection: api.IConnection,
) {
  // 1. Register platform admin (auto-authenticates)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminLoginIdentifier: string = platformAdminAuthorized.email;
  const platformAdminPassword: string = platformAdminJoinBody.password;

  // 2. As platform admin, create a visibility level used for both communities
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code matches creation payload",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 3. Register member user (join)
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

  const memberLoginIdentifier: string = memberAuthorized.email;
  const memberPassword: string = memberJoinBody.password;

  // 4. As member, create Community A
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberLoginIdentifier,
      password: memberPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityAIdentifier = `community-a-${RandomGenerator.alphaNumeric(6)}`;
  const communityACreateBody = {
    identifier: communityAIdentifier,
    title: "Community A",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityACreateBody },
    );
  typia.assert(communityA);
  TestValidator.equals(
    "community A identifier matches creation payload",
    communityA.identifier,
    communityACreateBody.identifier,
  );

  // 5. As same member, create Community B
  const communityBIdentifier = `community-b-${RandomGenerator.alphaNumeric(6)}`;
  const communityBCreateBody = {
    identifier: communityBIdentifier,
    title: "Community B",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBCreateBody },
    );
  typia.assert(communityB);
  TestValidator.equals(
    "community B identifier matches creation payload",
    communityB.identifier,
    communityBCreateBody.identifier,
  );

  // 6. As member, create membership request in Community B
  const membershipRequestCreateBody = {
    questionKey: "why-join",
    answerText: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequestB: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: communityB.identifier,
        body: membershipRequestCreateBody,
      },
    );
  typia.assert(membershipRequestB);
  const membershipRequestIdB: string = membershipRequestB.id;
  TestValidator.equals(
    "membership request community matches Community B",
    membershipRequestB.community.id,
    communityB.id,
  );

  // 7. Register a community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: null,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorId: string & tags.Format<"uuid"> = moderatorAuthorized.id;
  const moderatorLoginIdentifier: string = moderatorJoinBody.email;
  const moderatorPassword: string = moderatorJoinBody.password;

  // 8. As platform admin, assign moderator only to Community A
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminLoginIdentifier,
      password: platformAdminPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const assignmentCreateBody = {
    communityModeratorId: moderatorId,
    assignedAt: typia.random<string & tags.Format<"date-time">>(),
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const moderatorAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: communityA.identifier,
        body: assignmentCreateBody,
      },
    );
  typia.assert(moderatorAssignment);
  TestValidator.equals(
    "moderator assignment community matches Community A",
    moderatorAssignment.community.id,
    communityA.id,
  );

  // 9. As the assigned moderator, attempt to fetch membershipRequestB via Community A
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorLoginIdentifier,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  await TestValidator.error(
    "membership request detail should not be accessible via different community identifier",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.membershipRequests.at(
        connection,
        {
          communityIdentifier: communityA.identifier,
          membershipRequestId: membershipRequestIdB,
        },
      );
    },
  );
}
