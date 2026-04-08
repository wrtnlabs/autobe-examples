import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test that updating a comment with mismatched postId returns error.
 *
 * Validates the complete comment creation and update workflow with intentional post ID mismatch. Ensures that the system properly validates the comment-post relationship before allowing update operations, preventing unauthorized modifications through URL manipulation.
 *
 * The test creates two posts in the same community, creates a comment on the first post, then attempts to update that comment using the second post's ID in the URL path. This verifies that the backend validates the comment belongs to the specified post before processing the update.
 *
 * 1. Member registers and authenticates via authorize_member_join utility.
 * 2. Member creates a community using generate_random_reddit_community_member_communities_create.
 * 3. Member subscribes to their community using generate_random_reddit_community_member_member_subscriptions_create.
 * 4. Member creates Post A in the community using generate_random_reddit_community_posts_create.
 * 5. Member creates Post B in the same community using generate_random_reddit_community_posts_create.
 * 6. Member creates a comment on Post A using generate_random_reddit_community_member_posts_comments_create.
 * 7. Member attempts to update the comment using Post B's ID in the path, expecting 404 error.
 */
export async function test_api_comment_update_post_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Create Post A (comment will be created on this post)
  const postA = await generate_random_reddit_community_posts_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(postA);
  // 5. Create Post B (will use this ID incorrectly in update attempt)
  const postB = await generate_random_reddit_community_posts_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(postB);
  // 6. Create comment on Post A
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      { params: { postId: postA.id } },
    );
  typia.assert(comment);
  // 7. Attempt to update comment using Post B's ID (mismatched postId)
  // This should fail with 404 Not Found because the comment belongs to Post A, not Post B
  await TestValidator.error(
    "comment update with mismatched postId should return 404",
    async () => {
      await api.functional.redditCommunity.member.posts.comments.update(
        memberConnection,
        {
          postId: postB.id,
          commentId: comment.id,
          body: {
            content: "Updated content",
          } satisfies IRedditCommunityComment.IUpdate,
        },
      );
    },
  );
}
