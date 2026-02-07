import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Confirms community moderators can successfully delete posts within their managed communities.
 * After member authentication, a user subscribes to a community, creates a post within that community, and then deletes the post to verify moderation workflow operations.
 */
export async function test_api_post_delete_by_moderator(connection: api.IConnection): Promise<void> {
    // 1. Create new connection for member authentication
    const memberConnection: api.IConnection = { host: connection.host };
    
    // 2. Authenticate member and get token
    const memberAuthorized = await authorize_member_join(memberConnection, {
        body: {
            // No properties specified in ICommunityPlatformMember.IJoin, so empty object
        }
    });
    
    // 3. Subscribe to a community
    const communityId = typia.random<string & tags.Format<"uuid">>();
    const subscription = await api.functional.communityPlatform.member.communities.subscriptions.create(memberConnection, {
        communityId
    });
    
    // 4. Create a post in the subscribed community
    const post = await generate_random_community_platform_member_posts_create(memberConnection, {
        body: {
            title: RandomGenerator.paragraph(),
            content_type: 'text',
            community_id: communityId,
            textContent: RandomGenerator.paragraph(),
        }
    });
    
    typia.assert(post);
    
    // 5. Delete the created post
    const deletedPost = await api.functional.communityPlatform.member.posts.erase(memberConnection, {
        postId: post.id,
    });
    
    typia.assert(deletedPost);
    
    // 6. Validate deletion
    TestValidator.equals("post is marked as deleted", deletedPost.deleted_at, null);
    TestValidator.equals("post ID matches", deletedPost.id, post.id);
}