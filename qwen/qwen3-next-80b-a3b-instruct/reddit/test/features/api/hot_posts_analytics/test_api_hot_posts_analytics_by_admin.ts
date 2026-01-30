import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPost";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_hot_posts_analytics_by_admin(connection: api.IConnection): Promise<void> {
    // Step 1: Create admin actor connection and authenticate
    const adminConnection: api.IConnection = { host: connection.host };
    const adminEmail: string = typia.random<string & tags.Format<"email">>();
    const adminPassword: string = RandomGenerator.alphaNumeric(16);
    const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(adminConnection, {
        body: {
            email: adminEmail,
            password: adminPassword
        } satisfies ICommunityBbsAdmin.IJoin
    });
    
    // Step 2: Create member actor connection and authenticate
    const memberConnection: api.IConnection = { host: connection.host };
    const memberEmail: string = typia.random<string & tags.Format<"email">>().toLowerCase();
    const memberPassword: string = RandomGenerator.alphaNumeric(16);
    const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(memberConnection, {
        body: {
            email: memberEmail,
            password: memberPassword
        } satisfies ICommunityBbsMember.IJoin
    });
    
    // Step 3: Create a community using member connection for realistic context
    const community: ICommunityBbsCommunity = await generate_random_community_bbs_member_communities_create(memberConnection, {
        body: {
            name: RandomGenerator.name(3),
            description: RandomGenerator.paragraph({ sentences: 3 })
        } satisfies ICommunityBbsCommunity.ICreate
    });
    typia.assert(community);
    
    // Step 4: Create a post in the community using member connection
    const post: ICommunityBbsPost = await generate_random_community_bbs_member_posts_create(memberConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
            community_id: community.id,
            post_type: 'text'
        } satisfies ICommunityBbsPost.ICreate
    });
    typia.assert(post);
    
    // Step 5: Query the hot posts analytics endpoint with admin connection
    const hotPostsResult: IPageICommunityBbsPost.ISummary = await api.functional.communityBbs.admin.analytics.posts.hot.index(adminConnection);
    typia.assert(hotPostsResult);
    
    // Step 6: Validate pagination structure is correct
    TestValidator.equals('pagination current page is 1', hotPostsResult.pagination.current, 1);
    TestValidator.equals('pagination limit is 10', hotPostsResult.pagination.limit, 10);
    TestValidator.predicate('pagination records is greater than 0', hotPostsResult.pagination.records > 0);
    TestValidator.predicate('pagination pages is at least 1', hotPostsResult.pagination.pages >= 1);
    
    // Step 7: Validate that the created post appears in the hot posts list
    const postInHotList = hotPostsResult.data.find(item => item.id === post.id);
    TestValidator.equals('created post appears in hot posts list', postInHotList?.id, post.id);
    
    // Step 8: Validate post details in the hot list match the created post
    if (postInHotList) {
        TestValidator.equals('post title matches', postInHotList.title, post.title);
        // Note: 'hot_score' property doesn't exist on ISummary - this is schema mismatch, not type system error
        // Note: 'community' property doesn't exist on ISummary - this is schema mismatch, not type system error
        TestValidator.equals('post author id matches', postInHotList.author.id, member.id);
    }
}