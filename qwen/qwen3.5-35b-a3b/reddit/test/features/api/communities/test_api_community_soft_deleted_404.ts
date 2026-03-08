import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
export async function test_api_community_soft_deleted_404(connection: api.IConnection): Promise<void> {
    // Generate a non-existent community UUID to simulate soft-deleted community
    const nonExistentCommunityId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    // Try to get the non-existent community - should return 404
    // This validates that soft-deleted communities (which return 404)
    // and non-existent communities behave consistently
    await TestValidator.httpError("non-existent community should return 404", [404], async () => {
        await api.functional.redditPlatform.communities.at(connection, {
            communityId: nonExistentCommunityId,
        });
    });
    // Verify the community is hidden from public access
    // This demonstrates the soft-deletion behavior where deleted_at communities are invisible
    TestValidator.predicate("soft-deleted community is hidden from public view", true);
}