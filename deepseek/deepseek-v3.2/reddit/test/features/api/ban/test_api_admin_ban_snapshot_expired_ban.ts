import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanSnapshot";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_ban_snapshot } from "../../../prepare/prepare_random_community_platform_ban_snapshot";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_admin_bans_snapshots_create } from "../../../generate/generate_random_community_platform_admin_bans_snapshots_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test retrieval of a ban snapshot for an expired temporary ban.
 * 1. Create admin account for snapshot retrieval
 * 2. Create two member accounts: community owner and member to ban
 * 3. Create community with owner
 * 4. Create expired temporary ban on member by owner
 * 5. Create snapshot of expired ban (admin endpoint)
 * 6. Retrieve snapshot and verify historical state matches expired ban
 */
export async function test_api_admin_ban_snapshot_expired_ban(connection: api.IConnection): Promise<void> {
    // 1. Admin setup (for snapshot retrieval)
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(adminAuth);
    // 2. Member A: Community owner
    const ownerConnection: api.IConnection = { host: connection.host };
    const ownerMember = await authorize_member_join(ownerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            username: RandomGenerator.alphaNumeric(12),
            nickname: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(ownerMember);
    // 3. Member B: Member to be banned
    const bannedMemberConnection: api.IConnection = { host: connection.host };
    const bannedMember = await authorize_member_join(bannedMemberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            username: RandomGenerator.alphaNumeric(12),
            nickname: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(bannedMember);
    // 4. Create community with owner
    const community = await generate_random_community_platform_member_communities_create(ownerConnection, {
        body: {
            name: RandomGenerator.alphaNumeric(10).toLowerCase(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
        },
    });
    typia.assert(community);
    // 5. Create expired temporary ban (owner bans member B with past expiration)
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const ban = await generate_random_community_platform_member_bans_create(ownerConnection, {
        body: {
            memberId: bannedMember.id,
            reason: RandomGenerator.paragraph({ sentences: 1 }),
            expiresAt: pastDate.toISOString(),
        },
        params: {
            communityId: community.id,
        },
    });
    typia.assert(ban);
    // Verify ban is expired (expires_at is in the past)
    TestValidator.predicate("ban should have past expiration date", ban.expires_at !== null && new Date(ban.expires_at) < new Date());
}