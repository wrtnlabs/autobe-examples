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

/**
 * Validate that a platform administrator can retrieve detailed information
 * about a specific community-level ban on a member user, after realistic
 * community activity such as community and post creation has occurred.
 *
 * Business flow:
 *
 * 1. Platform admin joins (and becomes authenticated).
 * 2. Platform admin creates an account status master record.
 * 3. Platform admin creates a community visibility level.
 * 4. Member user joins and becomes authenticated.
 * 5. Member user creates a community using the visibility level.
 * 6. Platform admin creates a post type.
 * 7. Member user creates a post in the community using that post type.
 * 8. Community moderator joins and becomes authenticated.
 * 9. Community moderator bans the member user in that community.
 * 10. Platform admin logs in again to restore admin auth context.
 * 11. Platform admin fetches the ban detail via GET
 *     /communityPlatform/platformAdmin/memberUsers/{memberUserId}/communityBans/{banId}.
 *
 * The test asserts that:
 *
 * - The detailed ban matches the created ban by id and member/community
 *   associations.
 * - Reason, policy_category, started_at, and expires_at echo the creation
 *   payload.
 * - IssuedByCommunityModerator is populated with the moderator summary and
 *   issuedByPlatformAdmin remains null (since the ban was created by a
 *   community moderator).
 * - Is_active is true immediately after creation when the ban is currently in
 *   effect.
 * - Created_at and updated_at exist and updated_at is not earlier than
 *   created_at.
 */
export async function test_api_platform_admin_views_member_community_ban_detail_with_activity_context(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and becomes authenticated
  const platformAdminEmail =
    `admin+${RandomGenerator.alphabets(8)}@example.com` as string &
      tags.Format<"email">;
  const platformAdminPassword = RandomGenerator.alphaNumeric(16);

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates an account status
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(6)}`,
    label: "Active Member",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusBody,
      },
    );
  typia.assert(accountStatus);

  // 3. Platform admin creates a community visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Member user joins
  const memberEmail =
    `member+${RandomGenerator.alphabets(8)}@example.com` as string &
      tags.Format<"email">;
  const memberPassword = RandomGenerator.alphaNumeric(16);

  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://app.example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Member user creates a community using the visibility level
  const communityIdentifier = `community_${RandomGenerator.alphabets(10)}`;
  const communityBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 6. Platform admin creates a post type
  const postTypeBody = {
    code: `text_${RandomGenerator.alphabets(6)}`,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeBody,
      },
    );
  typia.assert(postType);

  // 7. Member user creates a post in the community
  const postBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 8. Community moderator joins
  const moderatorEmail =
    `moderator+${RandomGenerator.alphabets(8)}@example.com` as string &
      tags.Format<"email">;
  const moderatorPassword = RandomGenerator.alphaNumeric(16);

  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mod.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://mod.example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 9. Community moderator creates a community-level ban on the member user
  const now = new Date();
  const startedAt = now.toISOString() as string & tags.Format<"date-time">;
  const expiresAt = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const banCreateBody = {
    memberuser_id: memberAuthorized.id,
    reason: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Basic sanity checks on created ban
  TestValidator.equals(
    "created ban memberUser id matches authorized member",
    createdBan.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "created ban community id matches community",
    createdBan.community.id,
    community.id,
  );

  // 10. Platform admin logs in again to restore admin auth context
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminRelogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminRelogin);

  // 11. Platform admin fetches ban detail via platformAdmin view API
  const banDetail: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityBans.at(
      connection,
      {
        memberUserId: memberAuthorized.id,
        banId: createdBan.id,
      },
    );
  typia.assert(banDetail);

  // Assertions: identifiers
  TestValidator.equals(
    "ban detail id should equal created ban id",
    banDetail.id,
    createdBan.id,
  );
  TestValidator.equals(
    "ban detail memberUser id should equal member",
    banDetail.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "ban detail community id should equal community",
    banDetail.community.id,
    community.id,
  );

  // Assertions: issuer summaries
  TestValidator.predicate(
    "ban detail should have issuedByCommunityModerator when created by community moderator",
    banDetail.issuedByCommunityModerator !== null &&
      banDetail.issuedByCommunityModerator !== undefined,
  );
  if (
    banDetail.issuedByCommunityModerator !== null &&
    banDetail.issuedByCommunityModerator !== undefined
  ) {
    TestValidator.equals(
      "issuedByCommunityModerator summary has same id as moderator",
      banDetail.issuedByCommunityModerator.id,
      moderatorAuthorized.id,
    );
  }
  TestValidator.predicate(
    "ban detail issuedByPlatformAdmin should be null/undefined when not issued by platform admin",
    banDetail.issuedByPlatformAdmin === null ||
      banDetail.issuedByPlatformAdmin === undefined,
  );

  // Assertions: policy and temporal fields
  TestValidator.equals(
    "ban detail reason matches creation payload",
    banDetail.reason,
    banCreateBody.reason,
  );
  TestValidator.equals(
    "ban detail policy_category matches creation payload",
    banDetail.policy_category,
    banCreateBody.policy_category,
  );
  TestValidator.equals(
    "ban detail started_at matches creation payload",
    banDetail.started_at,
    banCreateBody.started_at,
  );
  TestValidator.equals(
    "ban detail expires_at matches creation payload",
    banDetail.expires_at,
    banCreateBody.expires_at,
  );

  // is_active should be true for a fresh ban between started_at and expires_at
  TestValidator.predicate(
    "ban detail is_active should be true immediately after creation",
    banDetail.is_active === true,
  );

  // created_at and updated_at temporal ordering
  TestValidator.predicate(
    "ban detail created_at and updated_at should be present",
    !!banDetail.created_at && !!banDetail.updated_at,
  );
  const createdAtTime = new Date(banDetail.created_at).getTime();
  const updatedAtTime = new Date(banDetail.updated_at).getTime();
  TestValidator.predicate(
    "ban detail updated_at should not be earlier than created_at",
    updatedAtTime >= createdAtTime,
  );
}
