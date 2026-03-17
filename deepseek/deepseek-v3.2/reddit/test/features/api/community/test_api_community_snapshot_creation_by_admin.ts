import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_snapshot } from "../../../prepare/prepare_random_community_platform_community_snapshot";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_admin_snapshots_create } from "../../../generate/generate_random_community_platform_admin_snapshots_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test the successful creation of a community snapshot by an administrator.
 * 1. Authenticate as admin using join operation
 * 2. Authenticate member and create community as prerequisite
 * 3. Create snapshot of that community
 * 4. Validate snapshot contains correct denormalized community attributes
 */
export async function test_api_community_snapshot_creation_by_admin(connection: api.IConnection): Promise<void> {
    // 1. Admin setup
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ICommunityPlatformAdmin.IJoin,
    });
    typia.assert(adminAuth);
    // 2. Member setup (community creator) - REMOVED DUPLICATE BLOCK
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(memberConnection, {
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
    typia.assert(memberAuth);
    // 3. Create community (prerequisite for snapshot) - USING UTILITY FUNCTION
    const community = await generate_random_community_platform_member_communities_create(memberConnection, {
        body: {
            name: RandomGenerator.alphabets(10),
            description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
    });
    typia.assert(community);
    // 4. Create snapshot - USING UTILITY FUNCTION
    const snapshot = await generate_random_community_platform_admin_snapshots_create(adminConnection, {
        params: {
            communityId: community.id,
        },
        body: {
            code: RandomGenerator.alphaNumeric(8),
            name: community.name,
            description: community.description,
            type: "public",
            status: "active",
            visibility: "visible",
            is_nsfw: false,
            is_archived: false,
            is_locked: false,
            member_count: 0,
            subscriber_count: community.subscriber_count satisfies number as number,
            post_count: 0,
            comment_count: 0,
            owner_member_id: memberAuth.id,
        } satisfies ICommunityPlatformCommunitySnapshot.ICreate,
    });
    typia.assert(snapshot);
    // 5. Validate snapshot attributes
    TestValidator.equals("snapshot name", snapshot.name, community.name);
    TestValidator.equals("snapshot description", snapshot.description, community.description);
    TestValidator.equals("snapshot type", snapshot.type, "public");
    TestValidator.equals("snapshot status", snapshot.status, "active");
    TestValidator.equals("snapshot visibility", snapshot.visibility, "visible");
    TestValidator.predicate("is_nsfw false", snapshot.is_nsfw === false);
    TestValidator.predicate("is_archived false", snapshot.is_archived === false);
    TestValidator.predicate("is_locked false", snapshot.is_locked === false);
    TestValidator.equals("member count", snapshot.member_count, 0);
    TestValidator.equals("subscriber count", snapshot.subscriber_count, (community.subscriber_count satisfies number as number) ?? 0);
    TestValidator.equals("post count", snapshot.post_count, 0);
    TestValidator.equals("comment count", snapshot.comment_count, 0);
    TestValidator.equals("owner id", snapshot.owner.id, memberAuth.id);
    TestValidator.equals("community id", snapshot.community.id, community.id);
    TestValidator.predicate("has snapshot id", typeof snapshot.id === "string");
    TestValidator.predicate("has created_at", typeof snapshot.created_at === "string");
    TestValidator.predicate("created_at is ISO date", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(snapshot.created_at));
}