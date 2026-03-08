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
export async function test_api_vote_downvote_removal(connection: api.IConnection): Promise<void> {
    // 1. Setup: Create member A (post author)
    const memberAConnection: api.IConnection = { host: connection.host };
    const memberA = await authorize_member_join(memberAConnection, {});
    typia.assert(memberA);
    // 2. Create a community as member A
    const community = await generate_random_community_platform_member_communities_create(memberAConnection, {});
    typia.assert(community);
    // 3. Subscribe member A to the community (required for posting)
    const subscriptionA = await generate_random_community_platform_member_subscriptions_create(memberAConnection, {
        body: {
            community_id: community.id,
        },
    });
    typia.assert(subscriptionA);
    // 4. Create a text post as member A
    const post = await generate_random_community_platform_member_posts_create(memberAConnection, {
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
    // Post score is 1 (automatic self-upvote per spec)
    TestValidator.equals("initial post score", post.score, 1);
    // 5. Setup: Create member B (voter)
    const memberBConnection: api.IConnection = { host: connection.host };
    const memberB = await authorize_member_join(memberBConnection, {});
    typia.assert(memberB);
    // 6. Subscribe member B to the community (required for voting)
    const subscriptionB = await generate_random_community_platform_member_subscriptions_create(memberBConnection, {
        body: {
            community_id: community.id,
        },
    });
    typia.assert(subscriptionB);
    // 7. Member B casts a downvote on the post
    const downvote = await api.functional.communityPlatform.member.posts.vote.cast(memberBConnection, {
        postId: post.id,
        body: {
            voteType: "downvote",
        } satisfies ICommunityPlatformVote.IRequest,
    });
    typia.assert(downvote);
    TestValidator.equals("downvote type", downvote.voteType, "downvote");
}