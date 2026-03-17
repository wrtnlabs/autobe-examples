import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePostSnapshot";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImage";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_post_image } from "../../../prepare/prepare_random_reddit_like_post_image";

/**
 * Test successfully retrieving a historical snapshot of a post after it has been edited.
 * A member creates a text post, then updates the post title and content (which automatically
 * creates a snapshot), then retrieves the original snapshot by its ID. Validate that the
 * snapshot contains the original title, original body content, correct content type, and
 * timestamps showing when the snapshot was captured.
 */
export async function test_api_post_snapshot_retrieve_historical_version(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post with original content
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        community_id: community.id,
        post_type: "text",
        body: originalBody,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Store original post data for later comparison
  const originalPostId = post.id;
  // 5. Update the post to trigger snapshot creation
  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedBody = RandomGenerator.content({ paragraphs: 3 });
  const updatedPost = await api.functional.redditLike.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: updatedTitle,
        body: updatedBody,
      } satisfies IRedditLikePost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Retrieve list of snapshots to get the snapshotId
  const snapshotPage = await api.functional.redditLike.posts.snapshots.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
        order: "desc",
      } satisfies IRedditLikePostSnapshot.IRequest,
    },
  );
  typia.assert(snapshotPage);
  // Verify we have at least one snapshot
  TestValidator.predicate(
    "snapshot list should contain at least one snapshot",
    snapshotPage.data.length > 0,
  );
  // Get the first (most recent) snapshot
  const snapshotSummary = snapshotPage.data[0];
  // 7. Retrieve the specific snapshot by ID
  const snapshot = await api.functional.redditLike.posts.snapshots.at(
    memberConnection,
    {
      postId: originalPostId,
      snapshotId: snapshotSummary.id,
    },
  );
  typia.assert(snapshot);
  // 8. Validate snapshot contains original data
  TestValidator.equals(
    "snapshot postId matches original post",
    snapshot.postId,
    originalPostId,
  );
  TestValidator.equals(
    "snapshot title matches original",
    snapshot.title,
    originalTitle,
  );
  // Validate text content exists and matches original
  const textContent = snapshot.textContent;
  typia.assertGuard<IRedditLikePostTextContent | null | undefined>(textContent);
  if (textContent !== null && textContent !== undefined) {
    TestValidator.equals(
      "snapshot body matches original",
      textContent.body,
      originalBody,
    );
  }
  // Validate snapshot timestamps show it was created before the update
  TestValidator.predicate(
    "snapshot created before post update",
    new Date(snapshot.createdAt).getTime() <=
      new Date(updatedPost.updatedAt).getTime(),
  );
}
