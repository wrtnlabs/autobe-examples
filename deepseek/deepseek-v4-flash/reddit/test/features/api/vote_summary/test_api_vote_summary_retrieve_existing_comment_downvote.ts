import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteSummary";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_votes_create } from "../../../generate/generate_random_community_platform_member_posts_comments_votes_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_vote_summary_retrieve_existing_comment_downvote(connection: api.IConnection): Promise<void> {
    // 1. Join member A (community owner, post author, comment author)
    const memberAConnection: api.IConnection = { host: connection.host };
    const memberA = await authorize_member_join(memberAConnection, {});
    typia.assert(memberA);
    // 2. Member A creates a community
    const community = await generate_random_community_platform_member_communities_create(memberAConnection, {});
    typia.assert(community);
    // 3. Member A subscribes to the community
    const subscriptionA = await generate_random_community_platform_member_communities_subscribers_create(memberAConnection, {
        params: { communityId: community.id },
    });
    typia.assert(subscriptionA);
    // 4. Member A creates a text post
    const post = await generate_random_community_platform_member_posts_create(memberAConnection, {
        body: {
            communityId: community.id,
            type: "text",
        },
    });
    typia.assert(post);
    // 5. Member A creates a comment on the post
    const comment = await generate_random_community_platform_member_posts_comments_create(memberAConnection, {
        params: { postId: post.id },
    });
    typia.assert(comment);
    // 6. Join member B (voter)
    const memberBConnection: api.IConnection = { host: connection.host };
    const memberB = await authorize_member_join(memberBConnection, {});
    typia.assert(memberB);
    // 7. Member B subscribes to the community
    const subscriptionB = await generate_random_community_platform_member_communities_subscribers_create(memberBConnection, {
        params: { communityId: community.id },
    });
    typia.assert(subscriptionB);
    // 8. Member B casts a downvote (-1) on the comment — triggers vote summary creation/upsert for comment target
    const commentVote = await generate_random_community_platform_member_posts_comments_votes_create(memberBConnection, {
        params: {
            postId: post.id,
            commentId: comment.id,
        },
        body: {
            value: -1 as number & tags.Type<"int32"> & tags.Minimum<-1> & tags.Maximum<1>,
        },
    });
    typia.assert(commentVote);
    // 9. Validate the downvote
    TestValidator.equals("vote value is -1 (downvote)", commentVote.value, -1);
    TestValidator.equals("voter is member B", commentVote.voter.id, memberB.id);
    TestValidator.equals("voted comment ID matches", commentVote.comment.id, comment.id);
}