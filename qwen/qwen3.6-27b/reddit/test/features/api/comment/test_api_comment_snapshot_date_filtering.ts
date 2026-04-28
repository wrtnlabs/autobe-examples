import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIREdditLikeCommunityPostCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIREdditLikeCommunityPostCommentSnapshot";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityPostCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPostCommentSnapshot";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test date range filtering on comment snapshots using the snapshot request DTO parameters dateRangeMin and dateRangeMax.
 *
 * Validates that the comment snapshot listing operation correctly filters results based on date-time boundaries. After creating a comment which automatically generates an initial snapshot, the test queries the snapshots endpoint with a date range that should include the comment's creation timestamp.
 *
 * The filtering should be inclusive on the minimum boundary and exclusive on the maximum boundary. Results should return only snapshot records with created_at timestamps within the specified time window.
 *
 * 1. Authenticate a member using the member join utility function with random credentials.
 * 2. Create a community using the community creation generation function.
 * 3. Subscribe the member to the community using the subscription creation generation function.
 * 4. Create a post in the subscribed community using the post creation generation function.
 * 5. Create a comment on the post using the comment creation generation function.
 * 6. Query snapshots with date range filtering using the snapshot listing endpoint.
 * 7. Validate pagination metadata contains expected records count.
 * 8. Verify that returned snapshots fall within the date range boundaries.
 */
export async function test_api_comment_snapshot_date_filtering(connection: api.IConnection): Promise<void> {
    // 1. Authenticate member
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            username: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IREdditLikeCommunityMember.IJoin,
    });
    // 2. Create community
    const community = await generate_random_reddit_like_community_member_communities_create(memberConnection, {
        body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
    });
    typia.assert(community);
    // 3. Subscribe to community
    const subscription = await generate_random_reddit_like_community_member_community_subscriptions_create(memberConnection, {
        body: {
            community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
    });
    typia.assert(subscription);
    // 4. Create post
    const post = await generate_random_reddit_like_community_member_posts_create(memberConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            post_type: "text",
            community_id: community.id,
        } satisfies IREdditLikeCommunityPost.ICreate,
    });
    typia.assert(post);
    // 5. Create comment
    const comment = await generate_random_reddit_like_community_member_posts_comments_create(memberConnection, {
        params: {
            postId: post.id,
        },
        body: { body: RandomGenerator.paragraph({ sentences: 5 }) } satisfies IRedditLikeCommunityPostComment.ICreate,
    });
    typia.assert(comment);
    // 6. Query snapshots with date range filter matching comment's creation time
    const commentCreatedAt: string & tags.Format<"date-time"> = comment.createdAt;
    const commentDate = new Date(commentCreatedAt);
    // Define date range boundaries around the comment creation time
    const date_range_min: string & tags.Format<"date-time"> = new Date(commentDate.getTime() - 3600000).toISOString() satisfies string & tags.Format<"date-time">;
    const date_range_max: string & tags.Format<"date-time"> = new Date(commentDate.getTime() + 3600000).toISOString() satisfies string & tags.Format<"date-time">;
    const snapshotRequest: IREdditLikeCommunityPostCommentSnapshot.IRequest = {
        dateRangeMin: date_range_min,
        dateRangeMax: date_range_max,
        page: 1,
        limit: 10,
    };
    const snapshots = await api.functional.redditLikeCommunity.member.posts.comments.snapshots.index(memberConnection, {
        postId: post.id,
        commentId: comment.id,
        body: snapshotRequest,
    });
    typia.assert(snapshots);
    // 7. Validate pagination and results
    TestValidator.equals("snapshot count matches pagination records count", snapshots.data.length, snapshots.pagination.records);
    TestValidator.equals("pagination current page matches request", snapshots.pagination.current, snapshotRequest.page);
    TestValidator.equals("pagination limit matches request", snapshots.pagination.limit, snapshotRequest.limit);
    TestValidator.predicate("pagination has valid total pages calculation", Math.ceil(snapshots.pagination.records / snapshots.pagination.limit) === snapshots.pagination.pages);
    for await (const snapshot of snapshots.data) {
        typia.assert(snapshot);
        TestValidator.predicate(`snapshot ${snapshot.id} created_at is within date range (inclusive min, exclusive max)`, snapshot.created_at >= date_range_min && snapshot.created_at < date_range_max);
        TestValidator.equals(`snapshot ${snapshot.id} references the correct comment`, snapshot.comment.id, comment.id);
        TestValidator.equals(`snapshot ${snapshot.id} body matches comment body`, snapshot.body, comment.body);
    }
}