import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import type { IRedditLikeCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostSnapshot";
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
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Test post snapshot retrieval success path.
 *
 * Validates the workflow for retrieving a point-in-time snapshot of a post after creation. After authenticating as a member, creates a community, subscribes to the community, and creates a text-type post with title and body. When a post is created, an initial snapshot is automatically generated capturing the post's state at creation time. Retrieves this snapshot using the post ID and snapshot ID, verifying it returns the complete snapshot data including the exact title (matching the post title), post type (text), body content (matching the post body), author reference (matching the creating member), community reference (matching the post community), and creation timestamp.
 *
 * Key validation points:
 * - Snapshot title matches original post title
 * - Snapshot post_type is 'text'
 * - Snapshot body matches original post body
 * - Snapshot author matches the post creator
 * - Snapshot community matches the post community
 * - Snapshot creation timestamp is populated and in valid ISO format
 *
 * 1. Authenticate as a member using authorize_member_join.
 * 2. Create a community using generated community data.
 * 3. Subscribe to the community as the authenticated member.
 * 4. Create a text-type post with title and body content.
 * 5. Generate a snapshot ID for the created post.
 * 6. Retrieve the snapshot using post ID and snapshot ID.
 * 7. Validate snapshot data matches the original post data.
 */
export async function test_api_post_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {} satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
    });
  typia.assert(member);
  // Step 2: Create a community
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<IREdditLikeCommunityCommunity.ICreate>,
      },
    );
  typia.assert(community);
  // Step 3: Subscribe member to the community
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies DeepPartial<IRedditLikeCommunityCommunitySubscription.ICreate>,
      },
    );
  typia.assert(subscription);
  // Step 4: Create a text-type post with title and body
  const postTitle = RandomGenerator.paragraph({ sentences: 1 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const post: IREdditLikeCommunityPost =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: postTitle,
          post_type: "text",
          community_id: community.id,
          body: postBody,
        } satisfies DeepPartial<IREdditLikeCommunityPost.ICreate>,
      },
    );
  typia.assert(post);
  // Step 5: Generate snapshot ID (the initial snapshot is created automatically with the post)
  // The snapshot ID uses the same UUID as the post for the initial auto-generated snapshot
  const snapshotId: string & tags.Format<"uuid"> = post.id satisfies string &
    tags.Format<"uuid">;
  // Step 6: Retrieve the snapshot
  const snapshot: IRedditLikeCommunityPostSnapshot =
    await api.functional.redditLikeCommunity.posts.snapshots.at(
      memberConnection,
      {
        postId: post.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // Step 7: Validate snapshot data matches original post data
  TestValidator.equals(
    "snapshot title matches post title",
    snapshot.title,
    postTitle,
  );
  TestValidator.equals(
    "snapshot post type is text",
    snapshot.post_type,
    "text",
  );
  TestValidator.equals(
    "snapshot body matches post body",
    snapshot.body,
    postBody,
  );
  TestValidator.equals(
    "snapshot community ID matches post community ID",
    snapshot.community.id,
    community.id,
  );
  TestValidator.equals(
    "snapshot author ID matches member ID",
    snapshot.author.id,
    member.id,
  );
  TestValidator.predicate(
    "snapshot has valid creation timestamp",
    snapshot.created_at.length > 0 && snapshot.created_at.includes("T"),
  );
}
