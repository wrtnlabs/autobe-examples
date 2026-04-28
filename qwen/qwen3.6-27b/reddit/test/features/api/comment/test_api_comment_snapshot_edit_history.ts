import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Test comment snapshot edit history functionality.
 *
 * Validates that when a member creates a comment on a post, an initial snapshot is created
 * capturing the comment's state at creation time. The test verifies snapshot retrieval functionality
 * returns snapshots in descending order by created_at timestamp (most recent first), ensuring each
 * snapshot correctly references the same comment and post while preserving the original body content.
 *
 * This validates the snapshot preservation workflow essential for audit trails and comment edit tracking,
 * ensuring the system maintains immutable historical records of comment content.
 *
 * 1. Authenticate as a new member via member join registration.
 * 2. Create a community for the member to post in.
 * 3. Subscribe the member to the newly created community.
 * 4. Create a post within the subscribed community.
 * 5. Create a comment on the post to generate the initial snapshot.
 * 6. Retrieve snapshots for the comment via the snapshots index endpoint.
 * 7. Verify at least one snapshot exists and references the correct comment and post.
 * 8. Validate snapshots are ordered by created_at in descending order (most recent first).
 */
export async function test_api_comment_snapshot_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberJoinBody });
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe the member to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a post within the subscribed community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 2,
          sentenceMax: 4,
        }),
      },
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post to generate initial snapshot
  const initialCommentBody = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: initialCommentBody,
        },
      },
    );
  typia.assert(comment);
  // 6. Retrieve snapshots for the comment
  const snapshotsPage =
    await api.functional.redditLikeCommunity.member.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IREdditLikeCommunityPostCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  // 7. Verify at least one snapshot exists
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshotsPage.data.length > 0,
  );
  // Verify snapshots have correct structure referencing the same comment and post
  for (const snapshot of snapshotsPage.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "comment matches the original comment",
      snapshot.comment.id,
      comment.id,
    );
  }
  // 8. Validate snapshots are ordered by created_at in descending order (most recent first)
  if (snapshotsPage.data.length >= 2) {
    for (let i = 1; i < snapshotsPage.data.length; i++) {
      TestValidator.predicate(
        `snapshot[${i - 1}] created_at >= snapshot[${i}] created_at`,
        new Date(snapshotsPage.data[i - 1].created_at) >=
          new Date(snapshotsPage.data[i].created_at),
      );
    }
  }
  // Verify the first snapshot contains the initial comment body
  if (snapshotsPage.data.length > 0) {
    TestValidator.equals(
      "first snapshot body matches initial comment body",
      snapshotsPage.data[0].body,
      initialCommentBody,
    );
  }
  // Verify pagination metadata
  TestValidator.equals(
    "pagination total records",
    snapshotsPage.pagination.records,
    snapshotsPage.data.length,
  );
  TestValidator.equals(
    "pagination current page",
    snapshotsPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshotsPage.pagination.limit, 100);
}