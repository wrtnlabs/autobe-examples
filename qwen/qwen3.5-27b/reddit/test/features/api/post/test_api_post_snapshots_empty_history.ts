import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test retrieving snapshots for a newly created post that has never been edited.
 *
 * Validates that when a post is created without any edits, exactly one snapshot exists capturing the initial state of the post at creation time. This ensures the snapshot system correctly records the initial post creation event and provides accurate pagination metadata.
 *
 * Special attention is given to verifying that the snapshot_created_at timestamp matches the post's created_at timestamp, confirming that the initial snapshot is created at the exact moment of post creation.
 *
 * 1. Register and authenticate as a member with email, password, and username.
 * 2. Subscribe to a community to gain posting ability.
 * 3. Create a new text post in the subscribed community.
 * 4. Retrieve snapshots for the newly created post.
 * 5. Verify exactly one snapshot exists with correct fields and timestamps.
 */
export async function test_api_post_snapshots_empty_history(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Subscribe to a community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(subscription);
  // 3. Create a new post (text type)
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        post_type: "text",
        community_id: subscription.community.id,
      },
    },
  );
  typia.assert(post);
  // 4. Retrieve snapshots for the newly created post
  const snapshots = await api.functional.redditClone.posts.snapshots.index(
    memberConnection,
    {
      postId: post.id,
      body: {},
    },
  );
  typia.assert(snapshots);
  // 5. Verify exactly one snapshot exists
  TestValidator.equals("snapshot count", snapshots.data.length, 1);
  // 6. Verify pagination metadata
  TestValidator.equals("pagination records", snapshots.pagination.records, 1);
  TestValidator.equals("pagination pages", snapshots.pagination.pages, 1);
  TestValidator.equals("pagination current", snapshots.pagination.current, 1);
  // 7. Verify the snapshot contains required fields
  const snapshot = snapshots.data[0];
  typia.assert(snapshot);
  TestValidator.predicate("has snapshot id", snapshot.id.length > 0);
  TestValidator.predicate("has title", snapshot.title.length > 0);
  TestValidator.predicate("has post type", snapshot.post_type.length > 0);
  TestValidator.predicate(
    "snapshot created at exists",
    snapshot.snapshot_created_at.length > 0,
  );
  // 8. Verify snapshot_created_at matches post's created_at
  TestValidator.equals(
    "snapshot timestamp matches post creation",
    snapshot.snapshot_created_at,
    post.created_at,
  );
  // 9. Verify title matches
  TestValidator.equals(
    "snapshot title matches post",
    snapshot.title,
    post.title,
  );
  // 10. Verify post_type matches
  TestValidator.equals(
    "snapshot post type matches",
    snapshot.post_type,
    post.post_type,
  );
  // 11. Verify preview is populated for text post
  TestValidator.predicate(
    "preview is populated for text post",
    snapshot.preview !== null && snapshot.preview.length > 0,
  );
}
