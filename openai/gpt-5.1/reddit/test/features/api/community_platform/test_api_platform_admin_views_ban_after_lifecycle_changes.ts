import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

export async function test_api_platform_admin_views_ban_after_lifecycle_changes(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also authenticates as platform admin)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: platformAdminEmail,
    password: "AdminPass123!",
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // Keep track of admin login identifier for later re-login
  const platformAdminLoginIdentifier: string = platformAdminEmail;
  const platformAdminPassword: string = platformAdminJoinBody.password;

  // 2. As platform admin, create an account status (master data)
  const accountStatusCreateBody = {
    key: "ACTIVE",
    label: "Active",
    description: "Active account status for all actors.",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusCreateBody,
      },
    );
  typia.assert(accountStatus);

  // 3. As platform admin, create a community visibility level
  const visibilityCode = "public";
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. As platform admin, create a post type
  const postTypeCode = "text";
  const postTypeCreateBody = {
    code: postTypeCode,
    name: "Text",
    description: "Plain text posts",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 5. Register member user (join also authenticates as that member)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: "MemberPass123!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  const memberUserId: string & tags.Format<"uuid"> = memberAuth.id;

  // 6. As member user, create a community
  const communityIdentifier = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
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
    "community identifier should match creation payload",
    community.identifier,
    communityIdentifier,
  );

  // 7. As member user, create a post in that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community id should match created community",
    post.community.id,
    community.id,
  );

  // 8. Register community moderator (join also authenticates as moderator)
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: moderatorEmail,
    password: "ModeratorPass123!",
    display_name: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuth);

  const moderatorId: string & tags.Format<"uuid"> = moderatorAuth.id;

  // 9. As community moderator, create a community-level ban for the member
  const now = new Date();
  const startedAt = new Date(now.getTime() - 60 * 1000).toISOString();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const banCreateBody = {
    memberuser_id: memberUserId,
    reason: "Repeated violation of community rules in recent posts.",
    policy_category: "spam",
    started_at: startedAt,
    expires_at: expiresAt,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const createdBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: banCreateBody,
      },
    );
  typia.assert(createdBan);

  TestValidator.equals(
    "ban member user summary id should match member user id",
    createdBan.memberUser.id,
    memberUserId,
  );

  TestValidator.equals(
    "ban community summary id should match community id",
    createdBan.community.id,
    community.id,
  );

  TestValidator.predicate(
    "ban should initially be active",
    createdBan.is_active === true,
  );

  TestValidator.equals(
    "ban deleted_at should be null initially",
    createdBan.deleted_at ?? null,
    null,
  );

  // 10. Switch back to platform admin via login using stored credentials
  const platformAdminLoginBody = {
    identifier: platformAdminLoginIdentifier,
    password: platformAdminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthAgain);

  // 11. As platform admin, view the ban detail for the member user
  const banFromAdminView: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityBans.at(
      connection,
      {
        memberUserId: memberUserId,
        banId: createdBan.id,
      },
    );
  typia.assert(banFromAdminView);

  // 12. Assertions on ban detail as viewed by platform admin
  TestValidator.equals(
    "admin view ban id should match created ban id",
    banFromAdminView.id,
    createdBan.id,
  );

  TestValidator.equals(
    "admin view member user should match",
    banFromAdminView.memberUser.id,
    createdBan.memberUser.id,
  );

  TestValidator.equals(
    "admin view community should match",
    banFromAdminView.community.id,
    createdBan.community.id,
  );

  TestValidator.predicate(
    "ban remains active when viewed by platform admin",
    banFromAdminView.is_active === true,
  );

  TestValidator.equals(
    "ban deleted_at remains null when viewed by platform admin",
    banFromAdminView.deleted_at ?? null,
    null,
  );

  TestValidator.predicate(
    "ban has community moderator issuer populated",
    banFromAdminView.issuedByCommunityModerator !== null &&
      banFromAdminView.issuedByCommunityModerator !== undefined,
  );

  if (
    banFromAdminView.issuedByCommunityModerator !== null &&
    banFromAdminView.issuedByCommunityModerator !== undefined
  ) {
    TestValidator.equals(
      "issuer moderator id should match moderator who created ban",
      banFromAdminView.issuedByCommunityModerator.id,
      moderatorId,
    );
  }

  TestValidator.equals(
    "platform admin issuer should be null for moderator-created ban",
    banFromAdminView.issuedByPlatformAdmin ?? null,
    null,
  );

  TestValidator.equals(
    "ban reason should be preserved across views",
    banFromAdminView.reason ?? null,
    createdBan.reason ?? null,
  );

  TestValidator.equals(
    "ban policy_category should be preserved across views",
    banFromAdminView.policy_category ?? null,
    createdBan.policy_category ?? null,
  );

  // 13. Exercise lifecycle change by lifting the ban via moderator erase
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAuthAgain: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAuthAgain);

  await api.functional.communityPlatform.communityModerator.communities.bans.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      banId: createdBan.id,
    },
  );
}
