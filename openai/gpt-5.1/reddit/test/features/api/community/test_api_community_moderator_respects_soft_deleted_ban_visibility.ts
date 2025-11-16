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

/**
 * Verify moderator ban detail visibility around soft-deleted bans.
 *
 * Business scenario:
 *
 * - A platform admin configures core master data (account status and visibility
 *   level).
 * - A member user creates a community.
 * - A community moderator issues a community-level ban against that member.
 * - The same moderator later lifts (erases) the ban.
 * - The moderator detail endpoint for member-user community bans must reflect the
 *   correct before/after state around the soft deletion.
 *
 * Steps:
 *
 * 1. Join as platform admin so we can create master data.
 * 2. As platform admin, create an account status that allows login/posting/voting.
 * 3. As platform admin, create a community visibility level master record.
 * 4. Join as member user and capture their id.
 * 5. As member user, create a community using the created visibility level code.
 * 6. Join as community moderator.
 * 7. As moderator, create a community-level ban against the member for that
 *    community.
 * 8. As moderator, fetch ban details via memberUsers.communityBans.at and assert
 *    that is_active is true and deleted_at is null/undefined.
 * 9. As moderator, erase the ban via communities.bans.erase.
 * 10. As moderator, fetch the same ban via memberUsers.communityBans.at again and
 *     assert that is_active is false and deleted_at is non-null, without any
 *     conflicting combination like is_active === true with non-null
 *     deleted_at.
 */
export async function test_api_community_moderator_respects_soft_deleted_ban_visibility(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (also authenticates admin connection)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create an account status that allows normal activity
  const accountStatusBody = {
    key: "ACTIVE_MEMBER_STATUS",
    label: "Active Member",
    description: "Active status that allows login, posting and voting.",
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

  // 3. Create a community visibility level master record
  const visibilityCode = "public-visible-" + RandomGenerator.alphabets(6);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visible",
    description: "Communities using this visibility are publicly discoverable.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 4. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword123!",
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 5. As member user, create a community with the visibility level code
  // (authentication token is already set by previous join call)
  const communityIdentifier = "community-" + RandomGenerator.alphabets(8);
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Ban Lifecycle",
    description: RandomGenerator.paragraph({ sentences: 8 }),
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

  // 6. Community moderator joins
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModeratorPassword123!",
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 7. As moderator, create a community-level ban against the member
  const banCreateBody = {
    memberuser_id: memberUserId,
    reason: "Test ban prior to soft delete.",
    policy_category: "test_policy",
    started_at: null,
    expires_at: null,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const createdBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier,
        body: banCreateBody,
      },
    );
  typia.assert(createdBan);

  // Verify ban basics
  TestValidator.equals(
    "created ban targets expected member user",
    createdBan.memberUser.id,
    memberUserId,
  );
  TestValidator.predicate(
    "created ban should be active before erase",
    createdBan.is_active === true,
  );
  TestValidator.predicate(
    "created ban should not have deleted_at set before erase",
    createdBan.deleted_at === null || createdBan.deleted_at === undefined,
  );

  // 8. Moderator fetches ban details via memberUsers.communityBans.at
  const initialDetail: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.memberUsers.communityBans.at(
      connection,
      {
        memberUserId,
        banId: createdBan.id,
      },
    );
  typia.assert(initialDetail);

  TestValidator.equals(
    "initial detail ban id matches created ban id",
    initialDetail.id,
    createdBan.id,
  );
  TestValidator.equals(
    "initial detail memberUser id matches target member",
    initialDetail.memberUser.id,
    memberUserId,
  );
  TestValidator.predicate(
    "initial detail should be active before erase",
    initialDetail.is_active === true,
  );
  TestValidator.predicate(
    "initial detail deleted_at should be nullish before erase",
    initialDetail.deleted_at === null || initialDetail.deleted_at === undefined,
  );

  // 9. As moderator, erase (lift) the ban
  await api.functional.communityPlatform.communityModerator.communities.bans.erase(
    connection,
    {
      communityIdentifier,
      banId: createdBan.id,
    },
  );

  // 10. Fetch the same ban again via moderator detail endpoint
  const postEraseDetail: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.memberUsers.communityBans.at(
      connection,
      {
        memberUserId,
        banId: createdBan.id,
      },
    );
  typia.assert(postEraseDetail);

  TestValidator.equals(
    "post-erase detail ban id remains the same",
    postEraseDetail.id,
    createdBan.id,
  );
  TestValidator.equals(
    "post-erase detail memberUser id remains the same",
    postEraseDetail.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "post-erase detail community id remains the same",
    postEraseDetail.community.id,
    createdBan.community.id,
  );
  TestValidator.predicate(
    "ban should not be active after erase",
    postEraseDetail.is_active === false,
  );
  TestValidator.predicate(
    "deleted_at should be set after erase",
    postEraseDetail.deleted_at !== null &&
      postEraseDetail.deleted_at !== undefined &&
      postEraseDetail.deleted_at.length > 0,
  );
  TestValidator.predicate(
    "no conflicting state: is_active true with non-null deleted_at is forbidden",
    !(
      postEraseDetail.is_active === true &&
      postEraseDetail.deleted_at !== null &&
      postEraseDetail.deleted_at !== undefined
    ),
  );
}
