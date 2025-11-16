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

export async function test_api_community_membership_creation_inactive_state_by_moderator(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-authenticates)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community",
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
    "visibility level code should match",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins (auto-authenticates as memberUser)
  const memberUsername = RandomGenerator.name(1);
  const memberEmail = `${RandomGenerator.alphabets(10)}@member.example.com`;
  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail as string & tags.Format<"email">,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 4. Member user creates a community
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
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
    "community identifier should match",
    community.identifier,
    communityIdentifier,
  );

  const communityId = community.id;

  // 5. Member user creates a membership request for that community
  const membershipRequestCreateBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier,
        body: membershipRequestCreateBody,
      },
    );
  typia.assert(membershipRequest);

  TestValidator.equals(
    "membership request community id should match",
    membershipRequest.community.id,
    communityId,
  );
  TestValidator.equals(
    "membership request requester member user id should match",
    membershipRequest.requesterMemberUser.id,
    memberUserId,
  );

  // 6. Community moderator joins and logs in
  const moderatorUsername = RandomGenerator.name(1);
  const moderatorEmail = `${RandomGenerator.alphabets(10)}@moderator.example.com`;

  const moderatorJoinBody = {
    username: moderatorUsername,
    email: moderatorEmail as string & tags.Format<"email">,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderation.console.example.com/register",
    referrer: "https://moderation.console.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorizedFromJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorizedFromJoin);

  // Explicit login to ensure context is correct
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://moderation.console.example.com/login",
    referrer: "https://moderation.console.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAuthorizedFromLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAuthorizedFromLogin);

  // 7. Community moderator creates an inactive membership for the member user
  const membershipCreateBody = {
    memberuser_id: memberUserId,
    is_active: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 8. Assert membership associations and inactive state
  TestValidator.equals(
    "membership community id should match created community",
    membership.community.id,
    communityId,
  );
  TestValidator.equals(
    "membership member user id should match requester",
    membership.memberuser.id,
    memberUserId,
  );

  TestValidator.equals(
    "membership should be inactive",
    membership.is_active,
    false,
  );

  // joined_at is required in DTO and must be a valid date-time string
  TestValidator.predicate(
    "joined_at should be a non-empty date-time string",
    typeof membership.joined_at === "string" && membership.joined_at.length > 0,
  );

  // ended_at should be null or undefined for a fresh membership
  TestValidator.predicate(
    "ended_at should be null or undefined on new membership",
    membership.ended_at === null || membership.ended_at === undefined,
  );

  // created_at and updated_at must be non-empty strings
  TestValidator.predicate(
    "created_at should be a non-empty string",
    typeof membership.created_at === "string" &&
      membership.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    typeof membership.updated_at === "string" &&
      membership.updated_at.length > 0,
  );

  // deleted_at should be null or undefined
  TestValidator.predicate(
    "deleted_at should be null or undefined on new membership",
    membership.deleted_at === null || membership.deleted_at === undefined,
  );
}
