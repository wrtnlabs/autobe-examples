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
 * Validate that a platform administrator can view a specific community
 * membership request for a given member user when all prerequisite
 * configuration and data have been created.
 *
 * Business flow covered by this test:
 *
 * 1. Platform admin self-registers using /auth/platformAdmin/join, establishing
 *    the platformAdmin authentication context.
 * 2. Platform admin creates an account status definition via POST
 *    /communityPlatform/platformAdmin/accountStatuses. (The created status is
 *    not directly used in the remaining calls but represents the prerequisite
 *    configuration that typically exists in a real system.)
 * 3. Platform admin creates a community visibility level via POST
 *    /communityPlatform/platformAdmin/communityVisibilityLevels and captures
 *    the business code so that new communities can reference it.
 * 4. A member user self-registers via /auth/memberUser/join, establishing a
 *    memberUser context with its own JWT tokens.
 * 5. As that authenticated member user, we create a new community using POST
 *    /communityPlatform/memberUser/communities with an ICreate payload that
 *    references the visibility level code from step 3.
 * 6. Still as the same member user, we submit a community membership request for
 *    the created community using POST
 *    /communityPlatform/memberUser/communities/{communityIdentifier}/membershipRequests.
 * 7. We then switch back to the platform admin authentication context by logging
 *    in with /auth/platformAdmin/login.
 * 8. Using platformAdmin privileges, we invoke GET
 *    /communityPlatform/platformAdmin/memberUsers/{memberUserId}/communityMembershipRequests/{membershipRequestId}
 *    via
 *    api.functional.communityPlatform.platformAdmin.memberUsers.communityMembershipRequests.at
 *    with the requester member user id and membership request id obtained from
 *    step 6.
 * 9. We assert that the returned ICommunityPlatformCommunityMembershipRequest
 *    object is well-typed and consistent with the created entities: IDs match,
 *    the community summary refers to the created community, the
 *    requesterMemberUser summary refers to the member user, and status looks
 *    like a normal initial state such as "pending".
 * 10. Finally, we lightly exercise scoping behavior by calling the same GET
 *     endpoint with a different random memberUserId and verify that an error is
 *     raised, using TestValidator.error. This confirms that the route is scoped
 *     to the owning member user and does not leak membership requests across
 *     users.
 */
export async function test_api_platform_admin_views_specific_membership_request_with_full_prerequisites(
  connection: api.IConnection,
) {
  // 1. Platform admin self-registers
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates an account status definition
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 3. Platform admin creates a visibility level master record
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityLevelBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. Member user self-registers
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 5. As member user, create a community referencing the visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
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
    "created community identifier should match request",
    community.identifier,
    communityIdentifier,
  );

  // 6. As member user, create a community membership request
  const membershipRequestBody = {
    questionKey: "why_join",
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
    "membership request community id matches created community",
    membershipRequest.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership request requester id matches member user",
    membershipRequest.requesterMemberUser.id,
    memberUserId,
  );

  const membershipRequestId = membershipRequest.id;

  // 7. Switch back to platform admin by logging in
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 8. Platform admin fetches the specific membership request for the member user
  const fetched: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMembershipRequests.at(
      connection,
      {
        memberUserId,
        membershipRequestId,
      },
    );
  typia.assert(fetched);

  // Validate key fields for consistency with the original membership request
  TestValidator.equals(
    "fetched membership request id matches original",
    fetched.id,
    membershipRequest.id,
  );
  TestValidator.equals(
    "fetched community id matches created community",
    fetched.community.id,
    community.id,
  );
  TestValidator.equals(
    "fetched requester member user id matches",
    fetched.requesterMemberUser.id,
    memberUserId,
  );

  TestValidator.predicate(
    "membership request status should be a non-empty string",
    fetched.status.length > 0,
  );
  TestValidator.predicate(
    "membership request should have requestedAt timestamp",
    typeof fetched.requestedAt === "string" && fetched.requestedAt.length > 0,
  );
  TestValidator.predicate(
    "membership request should have createdAt timestamp",
    typeof fetched.createdAt === "string" && fetched.createdAt.length > 0,
  );

  // 9. Light scoping validation: using a random other memberUserId should fail
  const otherMemberUserId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "fetching membership request with wrong memberUserId should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.communityMembershipRequests.at(
        connection,
        {
          memberUserId: otherMemberUserId,
          membershipRequestId,
        },
      );
    },
  );
}
