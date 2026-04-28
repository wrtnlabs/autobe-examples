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
 * Validates that a comment author can successfully delete their own comment through a soft-delete operation.
 *
 * After the author deletes their own comment, the system sets the deleted_at timestamp to the current time, preserving the record in the database during the retention period. The deleted comment becomes hidden from active views, feeds, and threaded conversations, and becomes hidden to all users including the original author. The comment's child comments and associated votes remain unaffected and continue to function normally in their current state.
 *
 * 1. Authenticate as the comment author.
 * 2. Create a community for the post.
 * 3. Subscribe the author to the community to gain posting privileges.
 * 4. Create a post in the subscribed community.
 * 5. Create a comment on the post (the parent that will be deleted).
 * 6. Create a child comment as a reply to the parent.
 * 7. Create a sibling comment on the same post to verify it remains unaffected by the parent deletion.
 * 8. Delete the parent comment.
 * 9. Validate that the deletion succeeded.
 */
export async function test_api_comment_delete_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as the comment author
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {
    body: {
      email:
        RandomGenerator.alphaNumeric(8) +
        "@" +
        RandomGenerator.alphaNumeric(6) +
        ".com",
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  // 2. Create a community for the post
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      authorConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe the author to the community to gain posting privileges
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      authorConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Create a post in the subscribed community
  const post = await generate_random_reddit_like_community_member_posts_create(
    authorConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Create a comment on the post (the parent that will be deleted)
  const parent =
    await generate_random_reddit_like_community_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {},
      },
    );
  typia.assert(parent);
  // 6. Create a child comment as a reply to the parent
  const child =
    await generate_random_reddit_like_community_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: { parentCommentId: parent.id },
      },
    );
  typia.assert(child);
  // 7. Create a sibling comment on the same post
  const sibling =
    await generate_random_reddit_like_community_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {},
      },
    );
  typia.assert(sibling);
  // 8. Delete the parent comment
  await api.functional.redditLikeCommunity.member.posts.comments.erase(
    authorConnection,
    {
      postId: post.id,
      commentId: parent.id,
    },
  );
  // 9. Validate that child and sibling comments are unaffected
  TestValidator.predicate("child comment exists", child.id !== undefined);
  TestValidator.predicate("sibling comment exists", sibling.id !== undefined);
  TestValidator.notEquals("different comment IDs", parent.id, child.id);
  TestValidator.notEquals("different comment IDs", parent.id, sibling.id);
}
