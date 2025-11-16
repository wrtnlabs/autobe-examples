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
 * Validate creation of a membership request for a restricted-visibility
 * community.
 *
 * Business scenario:
 *
 * - A platform admin defines a visibility level that implies join-by-request
 *   membership (e.g., code "restricted").
 * - A member user joins the platform, then creates a community using this
 *   restricted visibility level.
 * - The same member user subsequently submits a membership request to that
 *   community.
 *
 * The test validates that:
 *
 * - Visibility level creation works and returns a proper
 *   ICommunityPlatformCommunityVisibilityLevel.
 * - Community creation as a member user using the restricted visibility level
 *   succeeds and returns a valid ICommunityPlatformCommunity.
 * - A membership request can be created against that community via POST
 *   /communityPlatform/memberUser/communities/{communityIdentifier}/membershipRequests.
 * - The resulting ICommunityPlatformCommunityMembershipRequest links back to the
 *   expected community and requester member user and is in a pending-like
 *   state.
 */
export async function test_api_membership_request_creation_for_restricted_community(
  connection: api.IConnection,
) {
  // 1. Create a platform admin and log in to define a restricted visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a restricted visibility level via platform-admin API
  const restrictedVisibilityCode = `restricted_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: restrictedVisibilityCode,
    name: "Restricted",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code should match the requested restricted code",
    visibilityLevel.code,
    restrictedVisibilityCode,
  );

  // 3. Register a member user who will create the community and the membership request
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  TestValidator.equals(
    "member authorized username should equal join request username",
    memberAuthorized.username,
    memberJoinBody.username,
  );

  // 4. As the member user, create a community with the restricted visibility level
  const communityIdentifier = `restricted-${RandomGenerator.alphaNumeric(6)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: restrictedVisibilityCode,
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
    "community identifier should match the one requested",
    community.identifier,
    communityIdentifier,
  );

  TestValidator.equals(
    "community visibility level code should match restricted code",
    community.visibilityLevel.code,
    restrictedVisibilityCode,
  );

  // 5. As the same member user, create a membership request on that community.
  //    ICommunityPlatformCommunityMembershipRequest.ICreate only exposes
  //    questionKey and answerText; we treat answerText as the join-message.
  const membershipQuestionKey = "join_reason";
  const joinMessage = RandomGenerator.paragraph({ sentences: 4 });

  const membershipRequestCreateBody = {
    questionKey: membershipQuestionKey,
    answerText: joinMessage,
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: membershipRequestCreateBody,
      },
    );
  typia.assert(membershipRequest);

  // 6. Validate relationships and basic status semantics
  TestValidator.equals(
    "membership request community id should match created community",
    membershipRequest.community.id,
    community.id,
  );

  TestValidator.equals(
    "membership request requester id should match member user id",
    membershipRequest.requesterMemberUser.id,
    memberAuthorized.id,
  );

  // Status should be a non-empty string and conceptually correspond to a
  // pending-like state. We can only assert non-empty because the DTO models it
  // as a free-form string.
  TestValidator.predicate(
    "membership request status should be a non-empty string",
    membershipRequest.status.length > 0,
  );

  // Review-related fields should be unset (null or undefined) on creation.
  TestValidator.predicate(
    "reviewerCommunityModerator should be null or undefined on creation",
    membershipRequest.reviewerCommunityModerator === null ||
      membershipRequest.reviewerCommunityModerator === undefined,
  );

  TestValidator.predicate(
    "reviewNote should be null or undefined on creation",
    membershipRequest.reviewNote === null ||
      membershipRequest.reviewNote === undefined,
  );

  TestValidator.predicate(
    "decidedAt should be null or undefined on creation",
    membershipRequest.decidedAt === null ||
      membershipRequest.decidedAt === undefined,
  );

  // Ensure timestamps are present and non-empty strings
  TestValidator.predicate(
    "requestedAt should be a non-empty string",
    membershipRequest.requestedAt.length > 0,
  );
  TestValidator.predicate(
    "createdAt should be a non-empty string",
    membershipRequest.createdAt.length > 0,
  );

  // We cannot guarantee where the join message is persisted in the read DTO
  // because the write DTO only exposes questionKey/answerText, but this test
  // ensures that the server accepted the intended join message payload without
  // any error by successfully creating the membership request.
}
