import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_ban_creation_by_moderator_for_pending_member(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a platform admin (join)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/auth/join",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create an account status definition as platformAdmin
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(6)}`,
    label: "Active Member",
    description: RandomGenerator.paragraph({ sentences: 6 }),
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

  // 3. Create a visibility level master record as platformAdmin
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public Community",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 4. Register a member user via auth.memberUser.join
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphabets(16),
    ip: "127.0.0.1",
    href: "https://community.example.com/auth/join" as string &
      tags.Format<"uri">,
    referrer: "https://community.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 5. As that member user, create a new community
  const communityIdentifier = `test-community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // Basic sanity check on community identifier
  TestValidator.equals(
    "created community identifier should match request identifier",
    community.identifier,
    communityIdentifier,
  );

  // 6. As the same member user, create a membership request for the community
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Ensure the membership request is linked to the correct community and member
  TestValidator.equals(
    "membership request community id matches created community id",
    membershipRequest.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership requester member id matches member user id",
    membershipRequest.requesterMemberUser.id,
    memberUserId,
  );

  // 7. Register and authenticate a community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@moderator.example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphabets(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.console.local/auth/join" as string &
      tags.Format<"uri">,
    referrer: "https://moderator.console.local/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 8. As communityModerator, create a community-level ban for the pending member
  const startedAtDate = new Date();
  const startedAtIso = startedAtDate.toISOString();
  const expiresAtDate = RandomGenerator.date(
    new Date(startedAtDate.getTime() + 60 * 1000),
    7 * 24 * 60 * 60 * 1000,
  );
  const expiresAtIso = expiresAtDate.toISOString();

  const banCreateBody = {
    memberuser_id: memberUserId,
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    policy_category: "harassment",
    started_at: startedAtIso,
    expires_at: expiresAtIso,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const ban: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier,
        body: banCreateBody,
      },
    );
  typia.assert(ban);

  // 9. Business rule validations
  TestValidator.equals(
    "ban memberUser summary id should match target member user id",
    ban.memberUser.id,
    memberUserId,
  );

  TestValidator.equals(
    "ban community summary id should match created community id",
    ban.community.id,
    community.id,
  );

  TestValidator.equals(
    "ban reason should match input reason",
    ban.reason,
    banCreateBody.reason,
  );

  TestValidator.equals(
    "ban policy_category should match input policy_category",
    ban.policy_category,
    banCreateBody.policy_category,
  );

  // started_at and expires_at should be present and ordered
  TestValidator.predicate(
    "ban started_at must equal requested started_at",
    ban.started_at === startedAtIso,
  );

  TestValidator.predicate(
    "ban expires_at must be defined and after started_at",
    !!ban.expires_at && ban.expires_at > ban.started_at,
  );

  TestValidator.predicate(
    "ban should be active immediately after creation",
    ban.is_active === true,
  );
}
