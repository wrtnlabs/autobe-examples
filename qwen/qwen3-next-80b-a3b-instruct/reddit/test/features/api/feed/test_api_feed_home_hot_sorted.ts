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
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_feed_home_hot_sorted(connection: api.IConnection): Promise<void> {
    // 1. Create and authenticate member account
    const memberConnection: api.IConnection = { host: connection.host };
    const memberCredentials: IRedditCommunityMember.IJoin = {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
    };
    const memberData: IRedditCommunityMember.IAuthorized = await authorize_member_join(memberConnection, { body: memberCredentials });
    // 2. Create a community for subscription
    const communityConnection: api.IConnection = { host: connection.host };
    // Re-authenticate with the authenticated connection to ensure token is set
    communityConnection.headers = memberConnection.headers;
    const community: IRedditCommunityCommunity = await generate_random_reddit_community_member_communities_create(communityConnection, {
        body: {
            name: RandomGenerator.alphaNumeric(6),
            description: RandomGenerator.paragraph({ sentences: 2 }),
        },
    });
    typia.assert(community);
    // 3. Subscribe member to the created community
    const subscribeConnection: api.IConnection = { host: connection.host };
    subscribeConnection.headers = memberConnection.headers;
    const subscription: IRedditCommunitySubscription = await api.functional.redditCommunity.member.communities.subscribe.create(subscribeConnection, {
        communityId: community.id,
    });
    typia.assert(subscription);
    TestValidator.equals("community subscription created", subscription.community_id, community.id);
    // 4. Create a post in the subscribed community
    const postConnection: api.IConnection = { host: connection.host };
    postConnection.headers = memberConnection.headers;
    const post: IRedditCommunityPost = await generate_random_reddit_community_member_posts_create(postConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 8 }),
            community_id: community.id,
            content: RandomGenerator.content({ paragraphs: 2 }),
        },
    });
    typia.assert(post);
    // 5. Create an additional post in a different (unsubscribed) community to verify exclusion
    const otherCommunityConnection: api.IConnection = { host: connection.host };
    otherCommunityConnection.headers = memberConnection.headers;
    const otherCommunity: IRedditCommunityCommunity = await generate_random_reddit_community_member_communities_create(otherCommunityConnection, {
        body: {
            name: RandomGenerator.alphaNumeric(6),
            description: RandomGenerator.paragraph({ sentences: 2 }),
        },
    });
    typia.assert(otherCommunity);
    const otherPost: IRedditCommunityPost = await generate_random_reddit_community_member_posts_create(postConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 8 }),
            community_id: otherCommunity.id,
            content: RandomGenerator.content({ paragraphs: 2 }),
        },
    });
    typia.assert(otherPost);
    // 6. Verify that the post from unsubscribed community does not appear in the home feed
    // Now call the target endpoint: PATCH /redditCommunity/member/feeds/home with hot sorting
    const feedConnection: api.IConnection = { host: connection.host };
    feedConnection.headers = memberConnection.headers;
    const feedRequest: IRedditCommunityPost.IRequest = {
        sort: "hot",
        // No timeFilter specified - defaults to all
        // No page or limit specified - defaults to 1 and 20
    };
    const feedResponse: IPageIRedditCommunityPost.ISummary = await api.functional.redditCommunity.member.feeds.home.index(feedConnection, {
        body: feedRequest,
    });
    typia.assert(feedResponse);
    // Validate pagination metadata
    TestValidator.equals("pagination current page", feedResponse.pagination.current, 1);
    TestValidator.equals("pagination limit", feedResponse.pagination.limit, 20); // Default
    TestValidator.predicate("pagination records positive", feedResponse.pagination.records > 0);
    TestValidator.predicate("pagination pages positive", feedResponse.pagination.pages >= 1);
    // Validate that data contains exactly the expected number of posts
    TestValidator.predicate("feeds have at least one post", feedResponse.data.length > 0);
    // Validate that all returned posts are from the subscribed community (the first one)
    const subscribedPosts = feedResponse.data.filter(post => post.community.id === community.id);
    TestValidator.equals("all feed posts from subscribed community", feedResponse.data.length, subscribedPosts.length);
    // Validate that the post from unsubscribed community is NOT in the feed
    const otherCommunityPosts = feedResponse.data.filter(post => post.community.id === otherCommunity.id);
    TestValidator.equals("posts from unsubscribed community in feed", otherCommunityPosts.length, 0);
    // Validate each post summary has required fields
    feedResponse.data.forEach(post => {
        TestValidator.equals("post has id", typeof post.id, "string");
        TestValidator.equals("post has title", typeof post.title, "string");
        TestValidator.equals("post has author id", typeof post.author.id, "string");
        TestValidator.equals("post has author username", typeof post.author.username, "string");
        TestValidator.equals("post has community id", typeof post.community.id, "string");
        TestValidator.equals("post has community name", typeof post.community.name, "string");
        TestValidator.equals("post has voteScore", typeof post.voteScore, "number");
        TestValidator.equals("post has commentCount", typeof post.commentCount, "number");
        TestValidator.equals("post has createdAt", typeof post.createdAt, "string");
        TestValidator.predicate("voteScore is numeric", !isNaN(post.voteScore));
        TestValidator.predicate("commentCount is non-negative", post.commentCount >= 0);
        TestValidator.predicate("createdAt is ISO date format", /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(post.createdAt));
    });
    // Validate that the first post in the feed (highest hot score) is the one we created
    const firstPost = feedResponse.data[0];
    TestValidator.equals("first post is the created post", firstPost.id, post.id);
}