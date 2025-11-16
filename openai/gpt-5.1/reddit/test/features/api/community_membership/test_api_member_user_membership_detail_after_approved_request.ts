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
 * Validate member user's ability to fetch details of their own approved
 * community membership.
 *
 * Business workflow:
 *
 * 1. A platform admin creates a visibility level used by the test community.
 * 2. A member user registers and creates a community using that visibility level.
 * 3. The member user submits a membership request for that community.
 * 4. A community moderator registers and creates an active membership for that
 *    member user in the same community (approving the request conceptually).
 * 5. The member user, authenticated, calls the memberUser-scoped membership detail
 *    endpoint GET
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/communityMemberships/{membershipId}.
 * 6. The test verifies that the returned membership:
 *
 *    - Belongs to the requesting member user.
 *    - References the expected community.
 *    - Is active and has joined_at populated.
 *    - Matches the ICommunityPlatformCommunityMembership contract (validated via
 *         typia.assert).
 */
export async function test_api_member_user_membership_detail_after_approved_request(
  connection: api.IConnection,
) {
  // Helper to build a random but stable base URL for href/referrer
  const baseUrl: string = "https://e2e.community-platform.test";

  // ---------------------------------------------------------
  // 1. Platform admin: join and create a visibility level
  // ---------------------------------------------------------
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = "AdminPass123!";

  const platformAdminJoinInput = {
    username: RandomGenerator.name(1),
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: `${baseUrl}/admin/join`,
    referrer: `${baseUrl}/landing`,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinInput,
    });
  typia.assert(platformAdminAuthorized);

  // Create a dedicated visibility level used by the test community
  const visibilityCode: string = `public-e2e-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Public E2E ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // ---------------------------------------------------------
  // 2. Member user: join and create a community
  // ---------------------------------------------------------
  const memberUserEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUserPassword: string = "MemberPass123!";

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberUserEmail,
    password: memberUserPassword,
    ip: undefined,
    href: `${baseUrl}/member/join`,
    referrer: `${baseUrl}/landing`,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  const communityIdentifier: string = `e2e-community-${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `E2E Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // ---------------------------------------------------------
  // 3. Member user: create a membership request for the community
  // ---------------------------------------------------------
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);

  // Basic linkage checks between request, community, and member user
  TestValidator.equals(
    "membership request community id matches created community",
    membershipRequest.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership request requester matches member user",
    membershipRequest.requesterMemberUser.id,
    memberUserId,
  );

  // ---------------------------------------------------------
  // 4. Community moderator: join and create an active membership
  // ---------------------------------------------------------
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = "ModeratorPass123!";

  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(2),
    ip: undefined,
    href: `${baseUrl}/moderator/join`,
    referrer: `${baseUrl}/landing`,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const membershipCreateBody = {
    memberuser_id: memberUserId,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const createdMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(createdMembership);

  TestValidator.equals(
    "created membership belongs to member user",
    createdMembership.memberuser.id,
    memberUserId,
  );
  TestValidator.equals(
    "created membership community id matches community",
    createdMembership.community.id,
    community.id,
  );
  TestValidator.predicate(
    "created membership is active",
    createdMembership.is_active === true,
  );

  // ---------------------------------------------------------
  // 5. Switch back to member user via login (actor switching)
  // ---------------------------------------------------------
  const memberLoginBody = {
    identifier: memberUserEmail,
    password: memberUserPassword,
    ip: undefined,
    href: `${baseUrl}/member/login`,
    referrer: `${baseUrl}/landing`,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  TestValidator.equals(
    "login authorized member id matches original member user id",
    memberLoginAuthorized.id,
    memberUserId,
  );

  // ---------------------------------------------------------
  // 6. Member user fetches their membership detail via GET endpoint
  // ---------------------------------------------------------
  const fetched: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.memberUsers.communityMemberships.at(
      connection,
      {
        memberUserId,
        membershipId: createdMembership.id,
      },
    );
  typia.assert(fetched);

  // ---------------------------------------------------------
  // 7. Business assertions on fetched membership
  // ---------------------------------------------------------
  TestValidator.equals(
    "fetched membership id matches created membership id",
    fetched.id,
    createdMembership.id,
  );
  TestValidator.equals(
    "fetched membership belongs to requesting member user",
    fetched.memberuser.id,
    memberUserId,
  );
  TestValidator.equals(
    "fetched membership community id matches created community",
    fetched.community.id,
    community.id,
  );
  TestValidator.predicate(
    "fetched membership is active",
    fetched.is_active === true,
  );
  TestValidator.equals(
    "fetched membership joined_at matches created membership joined_at",
    fetched.joined_at,
    createdMembership.joined_at,
  );
}
