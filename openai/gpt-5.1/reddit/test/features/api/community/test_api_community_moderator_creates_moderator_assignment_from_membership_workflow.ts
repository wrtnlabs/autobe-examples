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
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate end-to-end community onboarding and moderator elevation.
 *
 * Business flow validated in this test:
 *
 * 1. A platform admin account exists and can create an account status definition,
 *    ensuring master data for account statuses is healthy.
 * 2. A member user registers and creates a community, capturing the community
 *    identifier used for downstream membership and moderator operations.
 * 3. The member user files a membership request for that community.
 * 4. A community moderator registers and then converts the member’s membership
 *    request into an active community membership using the moderator-scoped
 *    memberships.create endpoint.
 * 5. The same community moderator then creates a moderator assignment in that
 *    community, using their own moderator id as the assignee.
 * 6. The resulting moderator assignment is asserted to reference the same
 *    community, to point at the correct moderator identity, and to be active
 *    with consistent timestamps.
 *
 * This scenario ensures that moderator-scoped membership creation is usable as
 * a prerequisite to creating moderator assignments in the same community,
 * reflecting the intended governance workflow.
 */
export async function test_api_community_moderator_creates_moderator_assignment_from_membership_workflow(
  connection: api.IConnection,
) {
  // 1. Platform admin registration and login (actor setup)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Though join already authenticates, explicitly exercise login flow to
  // demonstrate actor switching semantics and ensure tokens are refreshed.
  const platformAdminLoginBody = {
    identifier: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  TestValidator.equals(
    "platform admin id remains stable across join/login",
    platformAdminAuthorized.id,
    platformAdminLogin.id,
  );

  // 2. Platform admin creates an account status definition
  const accountStatusBody = {
    key: "ACTIVE_MEMBER",
    label: "Active member/moderator",
    description: "Default active status for community actors in tests.",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusBody },
    );
  typia.assert(accountStatus);

  TestValidator.equals(
    "created account status key matches request",
    accountStatus.key,
    accountStatusBody.key,
  );

  // 3. Member user registration and login (actor setup)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  TestValidator.equals(
    "member user id remains stable across join/login",
    memberAuthorized.id,
    memberLogin.id,
  );

  // 4. Member user creates a community
  const communityIdentifier = `test-${RandomGenerator.alphabets(8)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: "public",
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
    communityCreateBody.identifier,
  );

  // 5. Member user files a membership request for the community
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 5 }),
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
    "membership request community id matches created community",
    membershipRequest.community.id,
    community.id,
  );

  TestValidator.equals(
    "membership request requester id matches member user",
    membershipRequest.requesterMemberUser.id,
    memberAuthorized.id,
  );

  // 6. Community moderator registration and login (actor setup)
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(15),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLogin);

  TestValidator.equals(
    "moderator id remains stable across join/login",
    moderatorAuthorized.id,
    moderatorLogin.id,
  );

  // 7. As community moderator, create a community membership for the member
  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
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
    "membership community id matches created community",
    membership.community.id,
    community.id,
  );

  TestValidator.equals(
    "membership memberuser id matches member user",
    membership.memberuser.id,
    memberAuthorized.id,
  );

  TestValidator.predicate(
    "membership is marked active",
    membership.is_active === true,
  );

  // 8. As community moderator, create a moderator assignment in the same community
  const assignedAt = new Date().toISOString();

  const moderatorAssignmentBody = {
    communityModeratorId: moderatorAuthorized.id,
    assignedAt,
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const moderatorAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.communityModerator.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: moderatorAssignmentBody,
      },
    );
  typia.assert(moderatorAssignment);

  // 9. Business-level assertions on moderator assignment
  TestValidator.equals(
    "moderator assignment community id matches membership community",
    moderatorAssignment.community.id,
    membership.community.id,
  );

  TestValidator.equals(
    "moderator assignment communityModerator id matches moderator actor",
    moderatorAssignment.communityModerator.id,
    moderatorAuthorized.id,
  );

  TestValidator.predicate(
    "moderator assignment is active",
    moderatorAssignment.isActive === true,
  );

  TestValidator.predicate(
    "assignedAt in response is not before request assignedAt",
    new Date(moderatorAssignment.assignedAt).getTime() >=
      new Date(assignedAt).getTime(),
  );
}
