import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformActivity";
import type { IRedditPlatformActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformActivity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_subscriptions_create } from "../../../generate/generate_random_reddit_platform_member_subscriptions_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_post_votes_cast } from "../../../generate/generate_random_reddit_platform_member_post_votes_cast";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_activity_timeline(connection: api.IConnection): Promise<void> {
    // 1. Admin setup
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_login(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        },
    });
    // 2. Member setup
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            username: typia.random<string & tags.MinLength<3> & tags.MaxLength<20> & tags.Pattern<"^[a-zA-Z0-9_]+$">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IRedditPlatformMember.IJoin,
    });
    // 3. Member creates community
    const community = await generate_random_reddit_platform_member_communities_create(memberConnection, {
        body: {
            name: typia.random<string & tags.MinLength<3> & tags.MaxLength<20> & tags.Pattern<"^[a-zA-Z0-9_-]+$">>(),
        } satisfies IRedditPlatformCommunity.ICreate,
    });
    typia.assert(community);
    // 4. Member subscribes to community
    await generate_random_reddit_platform_member_subscriptions_create(memberConnection, {
        body: {
            confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
    });
    // 5. Member creates post in subscribed community
    const post = await generate_random_reddit_platform_member_posts_create(memberConnection, {
        body: {
            title: typia.random<string & tags.MinLength<1> & tags.MaxLength<300> & tags.Pattern<".{1,300}">>(),
            postType: "TEXT" as const,
            redditPlatformCommunityId: community.id,
            content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditPlatformPost.ICreate,
    });
    typia.assert(post);
    // 6. Member creates comment on post
    const comment = await generate_random_reddit_platform_member_comments_create(memberConnection, {
        body: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
            post_id: post.id,
        } satisfies IRedditPlatformComment.ICreate,
    });
    typia.assert(comment);
    // 7. Member votes on post
    await generate_random_reddit_platform_member_post_votes_cast(memberConnection, {
        body: {
            post_id: post.id,
            vote_type: "UPVOTE" as const,
        } satisfies IRedditPlatformPostVote.ICreate,
    });
    // 8. Member votes on comment
    await api.functional.redditPlatform.member.comments.votes.vote(memberConnection, {
        commentId: comment.id,
        body: {
            vote_type: "upvote",
        } satisfies IRedditPlatformComment.IVoteRequest,
    });
    // 9. Admin retrieves activity history
    const activityResponse = await api.functional.redditPlatform.admin.histories.index(adminConnection, {
        body: {
            limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>>(),
            page: 1,
            sort: "NEWEST",
        } satisfies IRedditPlatformActivity.IRequest,
    });
    typia.assert(activityResponse);
    // 10. Validate pagination structure
    TestValidator.equals("has pagination metadata", activityResponse.pagination, {
        current: 1,
        limit: activityResponse.pagination.limit,
        records: activityResponse.pagination.records,
        pages: activityResponse.pagination.pages,
    });
    // 11. Validate activities count
    TestValidator.equals("has activities", activityResponse.data.length, 5);
    // 12. Validate each activity record structure
    for (const activity of activityResponse.data) {
        typia.assert(activity);
        TestValidator.equals("has activity_type", activity.activity_type, activity.activity_type);
        TestValidator.equals("has entity_type", activity.entity_type, activity.entity_type);
        TestValidator.equals("has entity_id", activity.entity_id, activity.entity_id);
        TestValidator.equals("has actor", activity.actor, {
            id: activity.actor.id,
            username: activity.actor.username,
            displayName: activity.actor.displayName,
            bio: activity.actor.bio,
            avatarUrl: activity.actor.avatarUrl,
            karmaScore: activity.actor.karmaScore,
            createdAt: activity.actor.createdAt,
            subscriptionCount: activity.actor.subscriptionCount,
        });
        TestValidator.equals("has created_at", activity.created_at, activity.created_at);
    }
    // 13. Validate activities are sorted by NEWEST (created_at DESC)
    const activities = activityResponse.data;
    for (let i = 1; i < activities.length; i++) {
        TestValidator.predicate("activities sorted by NEWEST", new Date(activities[i - 1].created_at) >=
            new Date(activities[i].created_at));
    }
    // 14. Validate entity references are populated
    for (const activity of activities) {
        if (activity.entity_type === "POST" || activity.entity_type === "COMMENT") {
            typia.assert(activity.entity);
        }
    }
}