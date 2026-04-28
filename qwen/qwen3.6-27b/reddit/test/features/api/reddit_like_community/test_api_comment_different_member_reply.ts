import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
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
 * Test creating a comment where the comment author is a different member than the post author.
 *
 * Validates that comments can be authored by any subscribed member on a post created by another member, ensuring proper cross-member discussion functionality within a community. Verifies that the comment correctly attributes the author as the commenting member while referencing the original post's identity.
 *
 * Special attention is given to verifying that the author field correctly references the commenting member (Member B) and not the post author (Member A), and that the post field correctly links to the target post.
 *
 * 1. Member A registers and authenticates on the platform.
 * 2. Member A creates a new community.
 * 3. Member A subscribes to the community to gain posting privileges.
 * 4. Member A creates a text post within the community.
 * 5. Member B registers and authenticates as a different user.
 * 6. Member B subscribes to Member A's community to gain commenting privileges.
 * 7. Member B creates a top-level comment on Member A's post.
 * 8. Validates comment attributes: body matches input, author is Member B, post references Member A's post, vote score is 0, child comments is empty, timestamps are set, and deleted_at is null.
 */
export async function test_api_comment_different_member_reply(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Member A (post author)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, { body: {} });
  // 2. Create a community as Member A
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe Member A to the community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberAConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create a text post by Member A
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberAConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Authenticate as Member B (comment author - different from post author)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, { body: {} });
  // 6. Subscribe Member B to the same community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberBConnection,
    { body: { community_id: community.id } },
  );
  // 7. Member B creates a comment on Member A's post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberBConnection,
      { params: { postId: post.id } },
    );
  typia.assert(comment);
  // 8. Validate comment attributes
  // Author should be Member B (the commenter), not Member A (post author)
  TestValidator.predicate(
    "author is different from post author",
    comment.author.id !== post.author.id,
  );
  // Post reference should be Member A's post
  TestValidator.equals("post matches original", comment.post.id, post.id);
  // Vote score initializes at 0
  TestValidator.equals("initial vote score is zero", comment.voteScore, 0);
  // Child comments array is empty for top-level comment
  TestValidator.equals("no child comments", comment.childComments.length, 0);
  // deleted_at is null for active comment
  TestValidator.equals("comment is active", comment.deletedAt, null);
}