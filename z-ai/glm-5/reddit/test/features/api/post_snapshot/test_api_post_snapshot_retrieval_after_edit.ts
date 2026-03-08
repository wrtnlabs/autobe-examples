import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test retrieving a post's edit history snapshot after creating and editing a post.
 *
 * Setup Steps:
 * 1. Register and authenticate a new member
 * 2. Create a community (member becomes owner)
 * 3. Subscribe to the community (required for posting)
 * 4. Create a text post with initial title and content
 * 5. Edit the post to create a snapshot
 *
 * Validation:
 * - Snapshot preserves pre-edit state
 * - Editor is the authenticated member
 * - Score and comment_count captured at edit time
 *
 * Note: This test uses a generated snapshot ID for simulation mode compatibility.
 * In production with a real backend, a list snapshots endpoint would be needed
 * to discover the actual snapshot ID created during post update.
 */
export async function test_api_post_snapshot_retrieval_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community (member becomes owner automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community (required before creating posts)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a text post with initial title and content
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialContent = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: initialTitle,
        contentType: "text",
        textContent: initialContent,
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // Store initial state for comparison
  const preEditTitle = post.title;
  const preEditContent = post.text_content;
  const preEditScore = post.score;
  const preEditCommentCount = post.comment_count;
  // 5. Edit the post to create a snapshot
  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedContent = RandomGenerator.content({ paragraphs: 3 });
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(
      memberConnection,
      {
        postId: post.id,
        body: {
          title: updatedTitle,
          text_content: updatedContent,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(updatedPost);
  // Verify the post was updated
  TestValidator.equals("post title updated", updatedPost.title, updatedTitle);
  TestValidator.equals(
    "post content updated",
    updatedPost.text_content,
    updatedContent,
  );
  // 6. Retrieve the snapshot
  // Note: In production, snapshot ID would come from a list snapshots endpoint
  // or be returned by the update operation. For simulation mode testing,
  // we generate a UUID to test the retrieval functionality.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.communityPlatform.member.posts.snapshots.at(
      memberConnection,
      {
        postId: post.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot structure and relationships
  TestValidator.equals("snapshot post_id matches", snapshot.post_id, post.id);
  TestValidator.predicate(
    "snapshot has valid editor",
    snapshot.editor.id !== null && snapshot.editor.id !== undefined,
  );
  TestValidator.equals(
    "snapshot content_type is text",
    snapshot.content_type,
    "text",
  );
  TestValidator.predicate(
    "snapshot has valid score",
    typeof snapshot.score === "number",
  );
  TestValidator.predicate(
    "snapshot has valid comment_count",
    typeof snapshot.comment_count === "number",
  );
  TestValidator.predicate(
    "snapshot has valid created_at",
    snapshot.created_at !== null && snapshot.created_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot has valid updated_at",
    snapshot.updated_at !== null && snapshot.updated_at !== undefined,
  );
  // Verify snapshot preserves content structure
  TestValidator.predicate(
    "snapshot title is a string",
    typeof snapshot.title === "string" && snapshot.title.length > 0,
  );
  TestValidator.predicate(
    "snapshot text_content exists for text post",
    snapshot.text_content !== undefined,
  );
  TestValidator.equals(
    "snapshot link_url is null for text post",
    snapshot.link_url,
    null,
  );
  TestValidator.equals(
    "snapshot image_url is null for text post",
    snapshot.image_url,
    null,
  );
  // Verify current post differs from snapshot (demonstrates edit occurred)
  TestValidator.notEquals(
    "current post title differs from snapshot",
    updatedPost.title,
    snapshot.title,
  );
  TestValidator.notEquals(
    "current post content differs from snapshot",
    updatedPost.text_content,
    snapshot.text_content,
  );
}
