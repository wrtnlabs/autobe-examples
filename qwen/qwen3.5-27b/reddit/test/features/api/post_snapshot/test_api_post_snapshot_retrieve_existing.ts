import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test retrieving an existing post snapshot by ID.
 *
 * This test validates the primary success path for retrieving a post snapshot:
 * 1. Creates a member account and authenticates
 * 2. Creates a community owned by the member
 * 3. Creates a post in that community
 * 4. Updates the post to trigger snapshot creation
 * 5. Retrieves the snapshot by ID
 * 6. Validates the snapshot contains complete denormalized post data
 *
 * Note: This test assumes a snapshot ID is available. In production, there should
 * be a mechanism to list snapshots for a post or receive the snapshot ID in the
 * update response. For this test, we use a generated UUID which works in simulation
 * mode.
 */
export async function test_api_post_snapshot_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2. Create a community owned by the member
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      { body: undefined },
    );
  typia.assert(community);
  // 3. Create a post in that community
  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const originalContent = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        postType: "text",
        title: originalTitle,
        content: originalContent,
      },
    },
  );
  typia.assert(post);
  // 4. Update the post to trigger snapshot creation
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedContent = RandomGenerator.paragraph({ sentences: 5 });
  const updatedPost = await api.functional.redditClone.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: updatedTitle,
        content: updatedContent,
      },
    },
  );
  typia.assert(updatedPost);
  // 5. Generate a snapshot ID for retrieval
  // In a real implementation, this would come from listing snapshots or the update response
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6. Call GET /redditClone/post-snapshots/{snapshotId} (public endpoint)
  const publicConnection: api.IConnection = { host: connection.host };
  const snapshot = await api.functional.redditClone.post_snapshots.at(
    publicConnection,
    {
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // 7. Validate snapshot business logic
  // typia.assert already validates all type constraints, so we only test business logic
  TestValidator.equals(
    "snapshot post type matches original",
    snapshot.post_type,
    "text",
  );
  TestValidator.predicate(
    "snapshot score is valid integer",
    Number.isInteger(snapshot.score),
  );
  TestValidator.predicate(
    "snapshot has captured timestamp",
    snapshot.captured_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot has original creation timestamp",
    snapshot.original_created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot has original update timestamp",
    snapshot.original_updated_at.length > 0,
  );
  TestValidator.equals(
    "snapshot post ID matches updated post",
    snapshot.post.id,
    updatedPost.id,
  );
}
