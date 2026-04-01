import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_vote_create } from "../../../generate/generate_random_reddit_community_member_posts_vote_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test changing an existing vote direction from upvote to downvote.
 *
 * This test validates the vote modification business logic:
 * 1. Member creates account and authenticates
 * 2. Creates a community and subscribes to it
 * 3. Creates a post in the community
 * 4. Casts an initial upvote on the post
 * 5. Changes the vote direction to downvote using PUT endpoint
 * 6. Verifies the vote record is updated (same ID, new direction, refreshed timestamp)
 */
export async function test_api_post_vote_direction_change(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as member
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            username: RandomGenerator.name(1),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IRedditCommunityMember.IJoin,
    });
    typia.assert(memberAuth);
    // 2. Create a community
    const community = await generate_random_reddit_community_member_communities_create(memberConnection, {
        body: {
            name: RandomGenerator.alphabets(10),
            description: RandomGenerator.paragraph({ sentences: 2 }),
        },
    });
    typia.assert(community);
    // 3. Subscribe to the community
    const subscription = await api.functional.redditCommunity.member.communities.subscription.create(memberConnection, {
        communityName: community.name,
    });
    typia.assert(subscription);
    // 4. Create a post in the community
    const post = await api.functional.redditCommunity.member.posts.create(memberConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            post_type: "text",
            text_content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
    });
    typia.assert(post);
    // 5. Cast initial upvote on the post
    const initialVote = await generate_random_reddit_community_member_posts_vote_create(memberConnection, {
        params: { postId: post.id },
        body: {
            direction: "UPVOTE",
        } satisfies IRedditCommunityPostVote.ICreate,
    });
    typia.assert(initialVote);
    // Verify initial vote is UPVOTE
    TestValidator.equals("initial vote direction", initialVote.direction, "UPVOTE");
    // 6. Change vote direction from upvote to downvote using PUT endpoint
    const updatedVote = await api.functional.redditCommunity.member.posts.vote.update(memberConnection, {
        postId: post.id,
        body: {
            direction: "DOWNVOTE",
        } satisfies IRedditCommunityPostVote.IUpdate,
    });
    typia.assert(updatedVote);
    // 7. Validate the vote was updated correctly
    TestValidator.equals("vote direction changed", updatedVote.direction, "DOWNVOTE");
    TestValidator.equals("vote ID unchanged (update not create)", updatedVote.id, initialVote.id);
    TestValidator.predicate("updated_at timestamp refreshed", updatedVote.updated_at > initialVote.updated_at);
    TestValidator.equals("member unchanged", updatedVote.member.id, initialVote.member.id);
    TestValidator.equals("post unchanged", updatedVote.post.id, initialVote.post.id);
}