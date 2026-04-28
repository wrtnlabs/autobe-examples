import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentSnapshot";
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
 * Test comment snapshot creation after comment edit to verify audit trail functionality.
 *
 * Validates the complete workflow from member authentication through comment creation, editing, and snapshot retrieval. Ensures that when a comment is edited, a new immutable snapshot is created capturing the updated body text, while preserving the original state in earlier snapshots. This test verifies the audit trail mechanism works correctly for moderation and verification purposes.
 *
 * The test flow demonstrates:
 * 1. Member authentication via the join endpoint to establish an authenticated session.
 * 2. Community creation and subscription to establish the context for posts and comments.
 * 3. Post creation within the subscribed community.
 * 4. Comment creation on the post with initial body text.
 * 5. Comment edit with new body text, which triggers snapshot creation.
 * 6. Snapshot retrieval and validation to verify the edit was captured correctly.
 *
 * 1. Authenticate member via join endpoint.
 * 2. Create a new community for the post context.
 * 3. Subscribe to the community for posting privileges.
 * 4. Create a text post in the community.
 * 5. Create a comment on the post with initial body text.
 * 6. Edit the comment with new body text (triggers snapshot creation).
 * 7. Retrieve the snapshot and validate it matches the edited content.
 */
export async function test_api_comment_snapshot_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });

  // 2. Create community
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);

  // 3. Subscribe to community
  const subscription =
    await api.functional.redditLikeCommunity.member.community_subscriptions.create(
      memberConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);

  // 4. Create post in community
  const post = await api.functional.redditLikeCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);

  // 5. Create comment on post
  const initialBody = RandomGenerator.paragraph({ sentences: 2 });
  const comment =
    await api.functional.redditLikeCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: { body: initialBody },
      },
    );
  typia.assert(comment);

  // 6. Edit the comment with new body text
  const editedBody = RandomGenerator.paragraph({ sentences: 4 });
  const updatedComment =
    await api.functional.redditLikeCommunity.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: { body: editedBody },
      },
    );
  typia.assert(updatedComment);

  // 7. Generate a new snapshot ID for the edit snapshot
  // Since snapshots are created as part of the edit operation, we generate a UUID to retrieve the snapshot
  const snapshotId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the snapshot created by the edit
  const snapshot =
    await api.functional.redditLikeCommunity.member.posts.comments.snapshots.at(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);

  // Validate snapshot content matches edited comment
  await TestValidator.equals(
    "snapshot body matches edited comment",
    snapshot.body,
    editedBody,
  );
  await TestValidator.equals(
    "snapshot commentId matches comment id",
    snapshot.commentId,
    comment.id,
  );
  await TestValidator.equals(
    "snapshot postId matches post id",
    snapshot.postId,
    post.id,
  );
  await TestValidator.predicate("snapshot has valid author", Boolean(snapshot.author));
  await TestValidator.predicate(
    "snapshot created_at is valid date-time",
    Boolean(snapshot.created_at),
  );
}