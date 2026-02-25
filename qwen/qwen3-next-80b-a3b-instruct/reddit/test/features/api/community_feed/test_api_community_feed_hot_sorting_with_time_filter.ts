import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_community_feed_hot_sorting_with_time_filter(connection: api.IConnection): Promise<void> {
    // 1. Authenticate member
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            username: RandomGenerator.name(1),
            displayName: RandomGenerator.name(),
        } satisfies IRedditCommunityMember.IJoin,
    });
    typia.assert(member);
    // 2. Create community
    const community = await generate_random_reddit_community_member_communities_create(memberConnection, {
        body: {
            name: RandomGenerator.alphaNumeric(8),
            description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
    });
    typia.assert(community);
    // 3. Create multiple posts in the community to populate the feed
    const postCount = 30;
    for (let i = 0; i < postCount; i++) {
        await generate_random_reddit_community_member_posts_create(memberConnection, {
            body: {
                community_id: community.id,
                title: RandomGenerator.paragraph({ sentences: 1 }),
                content: RandomGenerator.content({ paragraphs: 1 }),
            } satisfies IRedditCommunityPost.ICreate,
        });
    }
    // 4. Request community feed with 'hot' sorting and 'week' time filter
    const feedResponse = await api.functional.redditCommunity.communities.feeds.index(memberConnection, {
        communityId: community.id,
        body: {
            sort: "hot",
            timeFilter: "week",
            page: 1,
            limit: 25,
        } satisfies IRedditCommunityPost.IRequest,
    });
    typia.assert(feedResponse);
    // 5. Validate response structure and types
    TestValidator.equals("pagination limit is 25", feedResponse.pagination.limit, 25);
    TestValidator.equals("pagination page is 1", feedResponse.pagination.current, 1);
    TestValidator.equals("response data has 25 posts", feedResponse.data.length, 25);
    // Verify each post has the correct structure
    TestValidator.predicate("all posts have valid structure", feedResponse.data.every(post => {
        // Required top-level fields
        if (typeof post.id !== "string") return false;
        try { typia.assert<string & tags.Format<"uuid">>(post.id); } catch { return false; }
        if (typeof post.title !== "string" || post.title.length === 0)
            return false;
        if (typeof post.voteScore !== "number")
            return false;
        if (typeof post.commentCount !== "number")
            return false;
        if (typeof post.createdAt !== "string") return false;
        try { typia.assert<string & tags.Format<"date-time">>(post.createdAt); } catch { return false; }
        if (typeof post.updatedAt !== "string") return false;
        try { typia.assert<string & tags.Format<"date-time">>(post.updatedAt); } catch { return false; }
        // Verify author summary structure
        if (!post.author)
            return false;
        if (typeof post.author.id !== "string") return false;
        try { typia.assert<string & tags.Format<"uuid">>(post.author.id); } catch { return false; }
        if (typeof post.author.username !== "string" || post.author.username.length === 0)
            return false;
        if (typeof post.author.display_name !== "string" || post.author.display_name.length === 0)
            return false;
        if (typeof post.author.karma_score !== "number")
            return false;
        if (typeof post.author.created_at !== "string") return false;
        try { typia.assert<string & tags.Format<"date-time">>(post.author.created_at); } catch { return false; }
        // Verify community summary structure
        if (!post.community)
            return false;
        if (typeof post.community.id !== "string") return false;
        try { typia.assert<string & tags.Format<"uuid">>(post.community.id); } catch { return false; }
        if (typeof post.community.name !== "string" || post.community.name.length === 0)
            return false;
        if (typeof post.community.description !== "string")
            return false;
        if (typeof post.community.subscriber_count !== "number")
            return false;
        if (typeof post.community.created_at !== "string") return false;
        try { typia.assert<string & tags.Format<"date-time">>(post.community.created_at); } catch { return false; }
        if (typeof post.community.updated_at !== "string") return false;
        try { typia.assert<string & tags.Format<"date-time">>(post.community.updated_at); } catch { return false; }
        return true;
    }));
    // Verify all posts are from the created community
    TestValidator.predicate("all posts belong to the created community", feedResponse.data.every(post => post.community.id === community.id));
}