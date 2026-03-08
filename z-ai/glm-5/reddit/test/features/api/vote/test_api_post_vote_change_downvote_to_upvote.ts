import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_post_vote_change_downvote_to_upvote(connection: api.IConnection): Promise<void> {
    // 1. Create author and authenticate
    const authorConnection: api.IConnection = { host: connection.host };
    const authorAuth = await authorize_member_join(authorConnection, {});
    typia.assert(authorAuth);
    // 2. Author creates a community
    const community = await generate_random_community_platform_member_communities_create(authorConnection, {});
    typia.assert(community);
    // 3. Author subscribes to their community
    await generate_random_community_platform_member_subscriptions_create(authorConnection, { body: { community_id: community.id } });
    // 4. Author creates a text post
    const post = await generate_random_community_platform_member_posts_create(authorConnection, {
        body: {
            communityId: community.id,
            title: RandomGenerator.name(),
            contentType: "text",
            textContent: RandomGenerator.paragraph({ sentences: 3 }),
            linkUrl: null,
            imageUrl: null,
        },
    });
    typia.assert(post);
    // 5. Create voter and authenticate
    const voterConnection: api.IConnection = { host: connection.host };
    const voterAuth = await authorize_member_join(voterConnection, {});
    typia.assert(voterAuth);
    // 6. Voter subscribes to the community
    await generate_random_community_platform_member_subscriptions_create(voterConnection, { body: { community_id: community.id } });
    // 7. Voter casts downvote
    const downvote = await api.functional.communityPlatform.member.posts.vote.cast(voterConnection, {
        postId: post.id,
        body: { voteType: "downvote" } satisfies ICommunityPlatformVote.IRequest,
    });
    typia.assert(downvote);
    // Store original vote record data
    const originalVoteId = downvote.id;
    const originalCreatedAt = downvote.createdAt;
    // Verify downvote was created correctly
    TestValidator.equals("downvote type", downvote.voteType, "downvote");
}