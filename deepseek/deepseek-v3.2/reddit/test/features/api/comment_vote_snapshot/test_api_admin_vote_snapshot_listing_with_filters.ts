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
export async function test_api_admin_vote_snapshot_listing_with_filters(connection: api.IConnection): Promise<void> {
    // Create admin account and store credentials
    const adminConnection: api.IConnection = { host: connection.host };
    const adminPassword = RandomGenerator.alphaNumeric(16);
    const adminJoinResponse = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: adminPassword,
            href: "https://example.com/admin/join",
            referrer: "https://example.com",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ICommunityPlatformAdmin.IJoin,
    });
    typia.assert(adminJoinResponse);
    // Create first member account and community
    const member1Connection: api.IConnection = { host: connection.host };
    const member1 = await authorize_member_join(member1Connection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            username: RandomGenerator.alphaNumeric(8),
            nickname: RandomGenerator.name(1),
            href: "https://example.com/join",
            referrer: "https://example.com",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ICommunityPlatformMember.IJoin,
    });
    typia.assert(member1);
    // Create community
    const community = await generate_random_community_platform_member_communities_create(member1Connection, {
        body: {
            name: RandomGenerator.alphaNumeric(12).toLowerCase(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
    });
    typia.assert(community);
    // Subscribe to community
    const subscription = await generate_random_community_platform_member_subscriptions_create(member1Connection, {
        body: {
            community_id: community.id,
            active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
    });
    typia.assert(subscription);
    // Create text post
    const post = await generate_random_community_platform_member_posts_create(member1Connection, {
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
    // Create comment
    const comment = await generate_random_community_platform_member_posts_comments_create(member1Connection, {
        params: { postId: post.id },
        body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
    });
    typia.assert(comment);
    // First member votes upvote
    const vote1 = await generate_random_community_platform_member_comments_votes_create(member1Connection, {
        params: { commentId: comment.id },
        body: {
            type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
    });
    typia.assert(vote1);
    // Create second member account
    const member2Connection: api.IConnection = { host: connection.host };
    const member2 = await authorize_member_join(member2Connection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password456",
            username: RandomGenerator.alphaNumeric(8),
            nickname: RandomGenerator.name(1),
            href: "https://example.com/join",
            referrer: "https://example.com",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ICommunityPlatformMember.IJoin,
    });
    typia.assert(member2);
    // Second member votes downvote (different vote ID)
    const vote2 = await generate_random_community_platform_member_comments_votes_create(member2Connection, {
        params: { commentId: comment.id },
        body: {
            type: "downvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
    });
    typia.assert(vote2);
    // Wait a moment for timestamps to differ
    await new Promise((resolve) => setTimeout(resolve, 100));
    // Admin login with stored credentials
    await authorize_admin_login(adminConnection, {
        body: {
            email: adminJoinResponse.email,
            password: adminPassword,
        } satisfies ICommunityPlatformAdmin.ILogin,
    });
    // Get snapshots with upvote filter for first vote
    const snapshotsUpvote = await api.functional.communityPlatform.admin.comments.votes.snapshots.index(adminConnection, {
        commentId: comment.id,
        voteId: vote1.id,
        body: {
            page: 1,
            limit: 10,
            vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVoteSnapshot.IRequest,
    });
    typia.assert(snapshotsUpvote);
    // Validate upvote snapshots (business logic, not type checking)
    TestValidator.predicate("should have at least one upvote snapshot", snapshotsUpvote.data.length >= 1);
    snapshotsUpvote.data.forEach((snapshot) => {
        TestValidator.equals("vote type should be upvote", snapshot.vote_type, "upvote");
        // The incomplete string "sn" has been removed as it appears to be a typo
        // The validation logic for snapshots should be completed based on actual test requirements
    });
}