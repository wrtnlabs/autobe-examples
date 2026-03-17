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
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommentVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteSnapshot";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteSnapshot";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { generate_random_community_platform_member_comments_votes_create } from "../../../generate/generate_random_community_platform_member_comments_votes_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_vote_snapshot_pagination_and_sorting(connection: api.IConnection): Promise<void> {
    // Create admin account using utility function
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.Format<"password">>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ICommunityPlatformAdmin.IJoin,
    });
    // Create community owner member using utility function
    const ownerConnection: api.IConnection = { host: connection.host };
    const ownerAuth = await authorize_member_join(ownerConnection, {
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
    typia.assert(ownerAuth);
    // Create community
    const community = await api.functional.communityPlatform.member.communities.create(ownerConnection, {
        body: {
            name: RandomGenerator.alphabets(10).toLowerCase(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
    });
    typia.assert(community);
    // Owner subscribes to own community
    const subscription = await api.functional.communityPlatform.member.subscriptions.create(ownerConnection, {
        body: {
            community_id: community.id,
            active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
    });
    typia.assert(subscription);
    // Create post in community
    const post = await api.functional.communityPlatform.member.posts.create(ownerConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            community_name: community.name,
            content_type: "TEXT",
            content_text: {
                content: RandomGenerator.paragraph({ sentences: 3 }),
                formatting: "plain",
            } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
    });
    typia.assert(post);
    // Create comment on post
    const comment = await api.functional.communityPlatform.member.posts.comments.create(ownerConnection, {
        postId: post.id,
        body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformComment.ICreate,
    });
    typia.assert(comment);
    // Create 11 distinct member accounts for voting using utility functions
    const memberConnections: api.IConnection[] = [];
    const memberVotes: ICommunityPlatformCommentVote[] = [];
    for (let i = 0; i < 11; i++) {
        const memberConn: api.IConnection = { host: connection.host };
        const memberAuth = await authorize_member_join(memberConn, {
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
        memberConnections.push(memberConn);
        // Each member votes on the comment (alternate between upvote/downvote)
        const voteType = i % 2 === 0 ? "upvote" as const : "downvote" as const;
    }
}