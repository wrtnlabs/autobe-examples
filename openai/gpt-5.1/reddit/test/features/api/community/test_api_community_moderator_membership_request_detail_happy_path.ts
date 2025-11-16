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
 * Happy path: community moderator reads details of a pending membership
 * request.
 *
 * This test wires up the full dependency chain needed for a moderator to
 * successfully view a membership request in their community:
 *
 * 1. Register a platform admin (auth/platformAdmin/join).
 * 2. As platform admin, create a visibility level master record
 *    (communityPlatform/platformAdmin/communityVisibilityLevels.create).
 * 3. Register a member user (auth/memberUser/join).
 * 4. As that member user, create a community referencing the visibility level
 *    (communityPlatform/memberUser/communities.create).
 * 5. Register a community moderator (auth/communityModerator/join).
 * 6. As platform admin, assign that moderator to the community
 *    (communityPlatform/platformAdmin/communities.moderatorAssignments.create).
 * 7. As the member user, create a membership request for the community
 *    (communityPlatform/memberUser/communities.membershipRequests.create).
 * 8. As the community moderator, fetch the membership request detail using the
 *    moderator-scoped endpoint
 *    (communityPlatform/communityModerator/communities.membershipRequests.at).
 *
 * Assertions focus on the core business guarantees of the detail endpoint:
 *
 * - Response conforms to ICommunityPlatformCommunityMembershipRequest.
 * - The embedded community identifier/slug matches the path communityIdentifier
 *   and the originally created community.
 * - The requesterMemberUser corresponds to the member that created the request.
 * - Status remains in an initial pending-like state (non-empty string) and
 *   reviewer/decision fields (reviewerCommunityModerator, decidedAt) are still
 *   unset (null/undefined).
 */
export async function test_api_community_moderator_membership_request_detail_happy_path(
  connection: api.IConnection,
) {
  // 1. Register platform admin (auto-authenticates and sets Authorization header)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-" + RandomGenerator.alphaNumeric(6),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create visibility level master
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public with approval",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibility);
  TestValidator.equals(
    "visibility level code should match creation payload",
    visibility.code,
    visibilityCreateBody.code,
  );

  // 3. Register member user (join -> authenticated as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-" + RandomGenerator.alphaNumeric(6),
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create community referencing the visibility level code
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibility.code,
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
    "community identifier should match creation payload",
    community.identifier,
    communityCreateBody.identifier,
  );

  // 5. Register community moderator (join -> authenticated as communityModerator)
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-" + RandomGenerator.alphaNumeric(6),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://moderator.console.example.com/join",
    referrer: "https://moderator.console.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // Preserve moderator id for later assignment
  const moderatorId = moderatorAuthorized.id;

  // 6. Switch back to platform admin using login to perform moderator assignment
  const platformAdminLoginBody = {
    identifier: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.example.com/login",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // Create moderator assignment on the created community
  const now = new Date();
  const assignedAtIso = now.toISOString();
  const revokedAtIso: string | null = null;

  const moderatorAssignmentBody = {
    communityModeratorId: moderatorId,
    assignedAt: assignedAtIso,
    revokedAt: revokedAtIso,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const moderatorAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: moderatorAssignmentBody,
      },
    );
  typia.assert(moderatorAssignment);
  TestValidator.equals(
    "moderator assignment community slug should match created community identifier",
    moderatorAssignment.community.slug,
    community.identifier,
  );

  // 7. Switch to member user again to create a membership request
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  const membershipRequestCreateBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestCreateBody,
      },
    );
  typia.assert(membershipRequest);

  TestValidator.equals(
    "created membership request community slug should match created community identifier",
    membershipRequest.community.slug,
    community.identifier,
  );

  // 8. Switch to community moderator using login and fetch request detail
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://moderator.console.example.com/login",
    referrer: "https://moderator.console.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoggedIn);

  const detail: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.communityModerator.communities.membershipRequests.at(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipRequestId: membershipRequest.id,
      },
    );
  typia.assert(detail);

  // === Assertions on detail view ===

  // Community scoping: slug / identifier alignment
  TestValidator.equals(
    "detail community slug should equal original community identifier",
    detail.community.slug,
    community.identifier,
  );

  // Requester identity: id and username equality
  TestValidator.equals(
    "detail requester id should equal logged-in member id",
    detail.requesterMemberUser.id,
    memberLoggedIn.id,
  );
  TestValidator.equals(
    "detail requester username should equal member username",
    detail.requesterMemberUser.username,
    memberAuthorized.username,
  );

  // Status should be a non-empty string representing a pending-like state.
  TestValidator.predicate(
    "membership request status should be non-empty string",
    detail.status.length > 0,
  );

  // Fresh request should have no reviewer or decision timestamp set yet.
  TestValidator.equals(
    "reviewerCommunityModerator should be null or undefined for new request",
    detail.reviewerCommunityModerator ?? null,
    null,
  );
  TestValidator.equals(
    "decidedAt should be null or undefined for new request",
    detail.decidedAt ?? null,
    null,
  );

  // Timestamps presence assertions (requestedAt and createdAt must be valid date-times)
  TestValidator.predicate(
    "requestedAt should parse as valid date-time",
    () => !Number.isNaN(Date.parse(detail.requestedAt)),
  );
  TestValidator.predicate(
    "createdAt should parse as valid date-time",
    () => !Number.isNaN(Date.parse(detail.createdAt)),
  );
}
