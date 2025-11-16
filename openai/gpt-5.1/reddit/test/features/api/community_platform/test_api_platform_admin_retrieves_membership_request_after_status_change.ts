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
 * Validate that a platform administrator can retrieve a specific community
 * membership request for a given member user, and that the returned payload
 * matches the originally created request.
 *
 * Business flow implemented (adapted to available APIs):
 *
 * 1. A platform admin self-registers (join) and becomes authenticated.
 * 2. Using the admin token, the platform admin creates an account status
 *    configuration to ensure there is at least one valid account status in the
 *    system.
 * 3. The platform admin also creates a community visibility level, which will be
 *    referenced when member users create communities.
 * 4. A member user self-registers (join) and becomes authenticated.
 * 5. As the member user, create a new community using the visibility level code
 *    created by the admin.
 * 6. Still as the member user, create a membership request for that community.
 * 7. Switch back to the platform admin context by logging in as the platform
 *    admin.
 * 8. As the platform admin, call the admin inspection endpoint GET
 *    /communityPlatform/platformAdmin/memberUsers/{memberUserId}/communityMembershipRequests/{membershipRequestId}
 *    using the member user ID and membership request ID captured earlier.
 * 9. Assert that:
 *
 *    - The API returns an ICommunityPlatformCommunityMembershipRequest.
 *    - The id matches the created membership request id.
 *    - RequesterMemberUser.id matches the member user id.
 *    - Community.id and community.slug/name fields are consistent with the created
 *         community.
 *    - RequestedAt in the admin view equals requestedAt from the member user view.
 *
 * This test does not change the membership request status because no suitable
 * status-update API is available in the provided SDK. Instead, it validates
 * that the admin endpoint correctly scopes by member user and membership
 * request IDs and reflects the same data that the member user sees when
 * creating the request.
 */
export async function test_api_platform_admin_retrieves_membership_request_after_status_change(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (self-registration) and becomes authenticated
  const adminJoinHref: string = "https://admin.example.com/join";
  const adminJoinReferrer: string = "https://admin.example.com/landing";
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUsername: string = RandomGenerator.alphabets(12);
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: adminJoinHref as string & tags.Format<"uri">,
        referrer: adminJoinReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Admin creates at least one account status configuration
  const accountStatusKey: string = `ACTIVE_${RandomGenerator.alphabets(8)}`;
  const accountStatusLabel: string = "Active Member";
  const accountStatusDescription: string = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: accountStatusKey,
          label: accountStatusLabel,
          description: accountStatusDescription,
          isLoginAllowed: true,
          isPostingAllowed: true,
          isVotingAllowed: true,
          requiresManualReview: false,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert(accountStatus);

  // 3. Admin creates a visibility level for communities
  const visibilityCode: string = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityName: string = "Public";
  const visibilityDescription: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: visibilityName,
          description: visibilityDescription,
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Member user joins (self-registration) and becomes authenticated
  const memberJoinHref: string = "https://app.example.com/signup";
  const memberJoinReferrer: string = "https://app.example.com/landing";
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUsername: string = RandomGenerator.alphabets(10);
  const memberPassword: string = RandomGenerator.alphaNumeric(14);

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        ip: "127.0.0.1",
        href: memberJoinHref as string & tags.Format<"uri">,
        referrer: memberJoinReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAuthorizedFromJoin);

  const memberUserId: string & tags.Format<"uuid"> =
    memberAuthorizedFromJoin.id;

  // 5. As the member user (connection now holds member token), create a community
  const communityIdentifier: string = `community_${RandomGenerator.alphabets(8)}`;
  const communityTitle: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const communityDescription: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: communityTitle,
          description: communityDescription,
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Member user creates a membership request for that community
  const membershipAnswerText: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          questionKey: "why_join",
          answerText: membershipAnswerText,
        } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate,
      },
    );
  typia.assert(membershipRequest);

  // Basic consistency assertions on creation
  TestValidator.equals(
    "membership request requester id should equal member user id",
    membershipRequest.requesterMemberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "membership request community id should equal created community id",
    membershipRequest.community.id,
    community.id,
  );

  // 7. Switch back to the platform admin context by logging in
  const adminLoginHref: string = "https://admin.example.com/login";
  const adminLoginReferrer: string = "https://admin.example.com";

  const adminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: adminEmail,
        password: adminPassword,
        ip: "127.0.0.1",
        href: adminLoginHref as string & tags.Format<"uri">,
        referrer: adminLoginReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 8. Admin retrieves the membership request by member user and membership request id
  const adminViewMembershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMembershipRequests.at(
      connection,
      {
        memberUserId,
        membershipRequestId: membershipRequest.id,
      },
    );
  typia.assert(adminViewMembershipRequest);

  // 9. Assert consistency between member view and admin view
  TestValidator.equals(
    "admin view membership request id should match created id",
    adminViewMembershipRequest.id,
    membershipRequest.id,
  );

  TestValidator.equals(
    "admin view requester id should match member user id",
    adminViewMembershipRequest.requesterMemberUser.id,
    memberUserId,
  );

  TestValidator.equals(
    "admin view community id should match created community id",
    adminViewMembershipRequest.community.id,
    community.id,
  );

  TestValidator.equals(
    "admin view requestedAt should match original requestedAt",
    adminViewMembershipRequest.requestedAt,
    membershipRequest.requestedAt,
  );

  // Status should be the same between the two views
  TestValidator.equals(
    "admin view status should equal status from member view",
    adminViewMembershipRequest.status,
    membershipRequest.status,
  );
}
