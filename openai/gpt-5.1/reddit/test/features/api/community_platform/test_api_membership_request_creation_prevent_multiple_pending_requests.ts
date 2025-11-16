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
 * Verify that a member user cannot create multiple concurrent pending
 * membership requests for the same community.
 *
 * Business context:
 *
 * - Member users join the platform and can create communities.
 * - Communities have visibility levels created by platform admins.
 * - Member users submit membership requests to join communities; at most one
 *   pending request should exist per (memberUser, community) pair.
 *
 * Test flow:
 *
 * 1. Register and authenticate a platform admin.
 * 2. As platform admin, create a community visibility level.
 * 3. Register and authenticate a member user.
 * 4. As that member user, create a community referencing the visibility level.
 * 5. As the same member user, create a community membership request for that
 *    community and verify success and pending-like status.
 * 6. Immediately issue a second membership request for the same (memberUser,
 *    community) pair and assert that it fails with a business rule error (no
 *    second success).
 */
export async function test_api_membership_request_creation_prevent_multiple_pending_requests(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platform admin, create a community visibility level
  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Test Visibility Level",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
    "created visibility level code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register and authenticate a member user
  const memberUsername = `member_${RandomGenerator.alphaNumeric(6)}`;
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As this member user, create a community referencing the visibility level
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
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
  TestValidator.equals(
    "created community identifier should match request",
    community.identifier,
    communityIdentifier,
  );

  // 5. First membership request creation should succeed
  const firstMembershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const firstMembershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: firstMembershipRequestBody,
      },
    );
  typia.assert(firstMembershipRequest);

  // Validate requester and community linkage
  TestValidator.equals(
    "membership request community id should match created community id",
    firstMembershipRequest.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership request requester id should match member user id",
    firstMembershipRequest.requesterMemberUser.id,
    memberAuthorized.id,
  );

  // Basic pending-like status validation: non-empty status and undecided
  TestValidator.predicate(
    "membership request status string should be non-empty",
    firstMembershipRequest.status.length > 0,
  );
  TestValidator.predicate(
    "membership request decidedAt should be null or undefined for pending",
    firstMembershipRequest.decidedAt === null ||
      firstMembershipRequest.decidedAt === undefined,
  );

  // 6. Second membership request for same (memberUser, community) must fail
  const secondMembershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  await TestValidator.error(
    "second pending membership request for same community should be rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
        connection,
        {
          communityIdentifier: communityIdentifier,
          body: secondMembershipRequestBody,
        },
      );
    },
  );
}
