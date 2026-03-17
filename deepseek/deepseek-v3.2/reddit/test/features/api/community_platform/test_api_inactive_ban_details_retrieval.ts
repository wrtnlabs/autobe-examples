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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_inactive_ban_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create member (to be banned)
  const memberToBanConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(memberToBanConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Create community owner (to become moderator)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Assign moderator role to owner (community creator is already owner, but need moderation role record)
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        body: {
          memberId: owner.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(moderationRole);
  // Create ban (active)
  const ban = await generate_random_community_platform_member_bans_create(
    ownerConnection,
    {
      body: {
        memberId: bannedMember.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        expiresAt: null, // permanent ban
      } satisfies ICommunityPlatformBan.ICreate,
      params: { communityId: community.id },
    },
  );
  typia.assert(ban);
  // Update ban to inactive (unban)
  const updatedBan = await api.functional.communityPlatform.member.bans.update(
    ownerConnection,
    {
      communityId: community.id,
      banId: ban.id,
      body: {
        active: false,
      } satisfies ICommunityPlatformBan.IUpdate,
    },
  );
  typia.assert(updatedBan);
  // Verify ban is inactive in updated response
  TestValidator.equals(
    "ban should be inactive after update",
    updatedBan.active,
    false,
  );
  TestValidator.predicate(
    "unbanned_at should be set",
    updatedBan.unbanned_at !== null,
  );
  // Retrieve inactive ban details as admin
  const retrievedBan = await api.functional.communityPlatform.admin.bans.at(
    adminConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // Verify historical ban details remain intact
  TestValidator.equals("ban id unchanged", retrievedBan.id, ban.id);
  TestValidator.equals(
    "banned member unchanged",
    retrievedBan.bannedMember.id,
    bannedMember.id,
  );
  TestValidator.equals(
    "community unchanged",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals("reason unchanged", retrievedBan.reason, ban.reason);
  TestValidator.equals(
    "banned_at unchanged",
    retrievedBan.banned_at,
    ban.banned_at,
  );
  TestValidator.equals(
    "expires_at unchanged",
    retrievedBan.expires_at,
    ban.expires_at,
  );
  TestValidator.predicate(
    "active should be false",
    retrievedBan.active === false,
  );
  TestValidator.predicate(
    "unbanned_at should be set",
    retrievedBan.unbanned_at !== null,
  );
  TestValidator.notEquals(
    "unbanned_at differs from banned_at",
    retrievedBan.unbanned_at,
    retrievedBan.banned_at,
  );
  // Verify relationships
  TestValidator.equals(
    "banned member username matches",
    retrievedBan.bannedMember.username,
    bannedMember.username,
  );
  TestValidator.predicate(
    "issuing moderator role exists",
    retrievedBan.issuingModeratorRole !== null,
  );
  TestValidator.equals(
    "community name matches",
    retrievedBan.community.name,
    community.name,
  );
}
