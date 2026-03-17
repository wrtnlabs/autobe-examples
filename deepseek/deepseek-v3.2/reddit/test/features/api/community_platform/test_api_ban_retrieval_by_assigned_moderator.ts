import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

/**
 * Test delegated moderation workflow: owner → assign moderator → moderator bans → moderator retrieves.
 * Validates that moderators inherit viewing permissions and ban records correctly reference issuing moderator.
 */
export async function test_api_ban_retrieval_by_assigned_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate three members
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {});
  typia.assert(bannedMember);
  // 2. Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Owner assigns moderator role to second member
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        body: {
          memberId: moderator.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(moderationRole);
  TestValidator.equals(
    "role type is moderator",
    moderationRole.roleType,
    "moderator",
  );
  TestValidator.equals(
    "member assigned matches",
    moderationRole.member.id,
    moderator.id,
  );
  // 4. Moderator creates a ban on third member
  const ban = await generate_random_community_platform_member_bans_create(
    moderatorConnection,
    {
      body: {
        memberId: bannedMember.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        expiresAt: null,
      } satisfies ICommunityPlatformBan.ICreate,
      params: { communityId: community.id },
    },
  );
  typia.assert(ban);
  TestValidator.equals(
    "banned member matches",
    ban.bannedMember.id,
    bannedMember.id,
  );
  TestValidator.equals("community matches", ban.community.id, community.id);
  TestValidator.predicate("ban is active", ban.active);
  // 5. Moderator retrieves the ban details
  const retrievedBan = await api.functional.communityPlatform.member.bans.at(
    moderatorConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // 6. Validate that issuing moderator role references the moderator (not owner)
  TestValidator.equals("ban ID matches", retrievedBan.id, ban.id);
  TestValidator.equals(
    "banned member matches",
    retrievedBan.bannedMember.id,
    bannedMember.id,
  );
  TestValidator.equals(
    "community matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals("reason matches", retrievedBan.reason, ban.reason);
  TestValidator.equals(
    "active status matches",
    retrievedBan.active,
    ban.active,
  );
  // CRITICAL: Verify issuing moderator role references the moderator, not owner
  TestValidator.equals(
    "issuing moderator role references assigned moderator",
    retrievedBan.issuingModeratorRole.member.id,
    moderator.id,
  );
  TestValidator.equals(
    "issuing moderator role type is moderator",
    retrievedBan.issuingModeratorRole.roleType,
    "moderator",
  );
  TestValidator.notEquals(
    "issuing moderator is NOT the owner",
    retrievedBan.issuingModeratorRole.member.id,
    owner.id,
  );
  // Validate ban timestamps
  TestValidator.predicate("banned_at is valid date", () => {
    const date = new Date(retrievedBan.banned_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "expires_at is null for permanent ban",
    retrievedBan.expires_at,
    null,
  );
  TestValidator.equals(
    "unbanned_at is null for active ban",
    retrievedBan.unbanned_at,
    null,
  );
}
