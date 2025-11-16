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

export async function test_api_community_ban_update_by_community_moderator_deactivate_ban(
  connection: api.IConnection,
) {
  // 1) Register platform admin (join)
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword = "Password123!";
  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(2),
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  // 2) Login as platform admin (optional but validates login & header switch)
  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: platformAdminPassword,
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLogin);

  // 3) As platform admin, create an account status
  const accountStatusKey = `ACTIVE_MEMBER_${RandomGenerator.alphabets(8)}`;
  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: accountStatusKey,
          label: `Active Member ${RandomGenerator.alphabets(4)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          isLoginAllowed: true,
          isPostingAllowed: true,
          isVotingAllowed: true,
          requiresManualReview: false,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert(accountStatus);

  // 4) As platform admin, create a visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(8)}`;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Public ${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 5) Register member user (join)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123!";
  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: memberEmail,
        password: memberPassword,
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  // 6) Login as member user
  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberEmail,
        password: memberPassword,
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLogin);

  // 7) Create community as member user
  const communityIdentifier = `test-community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    // omit primaryTagIds to let backend default behaviour work
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
    "community identifier matches request",
    community.identifier,
    communityIdentifier,
  );

  // 8) Create membership request for this community as member user
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
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
    "membership request community matches",
    membershipRequest.community.id,
    community.id,
  );

  // 9) Register community moderator (join)
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "Password123!";
  const moderatorJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(2),
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorJoin);

  // 10) Login as community moderator
  const moderatorLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        identifier: moderatorEmail,
        password: moderatorPassword,
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert(moderatorLogin);

  // 11) Create an active community ban targeting member user
  const now = new Date();
  const tomorrow = RandomGenerator.date(now, 24 * 60 * 60 * 1000);

  const banCreateBody = {
    memberuser_id: memberJoin.id,
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    policy_category: "spam",
    started_at: now.toISOString(),
    expires_at: tomorrow.toISOString(),
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const ban: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: banCreateBody,
      },
    );
  typia.assert(ban);

  TestValidator.equals(
    "ban community matches created community",
    ban.community.id,
    community.id,
  );
  TestValidator.equals(
    "ban target member matches member user",
    ban.memberUser.id,
    memberJoin.id,
  );

  // 12) Deactivate the ban via update (set is_active=false, preserve other fields)
  const updateBody = {
    is_active: false,
  } satisfies ICommunityPlatformCommunityBan.IUpdate;

  const updatedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.update(
      connection,
      {
        communityIdentifier: community.identifier,
        banId: ban.id,
        body: updateBody,
      },
    );
  typia.assert(updatedBan);

  // 13) Validation that identity and policy attributes are preserved, is_active flipped
  TestValidator.equals(
    "ban id is unchanged after update",
    updatedBan.id,
    ban.id,
  );

  TestValidator.equals(
    "ban community remains the same",
    updatedBan.community.id,
    ban.community.id,
  );

  TestValidator.equals(
    "ban member user remains the same",
    updatedBan.memberUser.id,
    ban.memberUser.id,
  );

  TestValidator.equals(
    "ban started_at remains the same",
    updatedBan.started_at,
    ban.started_at,
  );

  TestValidator.equals(
    "ban is_active is now false",
    updatedBan.is_active,
    false,
  );

  TestValidator.equals(
    "ban expires_at remains the same",
    updatedBan.expires_at,
    ban.expires_at,
  );

  TestValidator.equals(
    "ban reason remains the same",
    updatedBan.reason,
    ban.reason,
  );

  TestValidator.equals(
    "ban policy_category remains the same",
    updatedBan.policy_category,
    ban.policy_category,
  );

  // 14) Optionally, verify updated_at changed if both timestamps are present
  if (updatedBan.updated_at && ban.updated_at) {
    TestValidator.notEquals(
      "ban updated_at should change after update",
      updatedBan.updated_at,
      ban.updated_at,
    );
  }
}
