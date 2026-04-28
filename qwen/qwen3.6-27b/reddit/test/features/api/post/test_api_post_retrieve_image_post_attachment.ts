import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
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
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Test retrieving an image post with its attachment via the public GET endpoint.
 *
 * Validates the complete image post retrieval flow including member registration, community creation, subscription, and image post creation. Ensures that the public endpoint returns the post with all image attachment metadata correctly populated, while body and url fields are null for image-type posts.
 *
 * Special attention is given to verifying that postImage contains complete metadata (id, image_url, filename, file_size_bytes, content_type, width, height, hash_sha256, created_at, updated_at), body and url are null for image posts, vote_score and comment_count start at zero, and the postImage.post reference correctly points back to the retrieved post summary.
 *
 * 1. Member registers a new account for authenticated operations.
 * 2. Member creates a new community.
 * 3. Member subscribes to their own community (required prerequisite for post creation).
 * 4. Member creates an image post with title and post_type set to 'image' in the subscribed community.
 * 5. Public GET endpoint retrieves the post by postId.
 * 6. Validates post_type equals 'image', body is null, url is null.
 * 7. Validates postImage contains complete attachment metadata.
 * 8. Validates vote_score is 0 and comment_count is 0.
 * 9. Validates postImage.post reference points back to the retrieved post summary.
 */
export async function test_api_post_retrieve_image_post_attachment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe to community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create image post
  const body = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    post_type: "image",
    community_id: community.id,
  } satisfies IREdditLikeCommunityPost.ICreate;
  const createdPost =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      { body },
    );
  typia.assert(createdPost);
  // 5. Retrieve post via public GET endpoint
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedPost = await api.functional.redditLikeCommunity.posts.at(
    publicConnection,
    { postId: createdPost.id },
  );
  typia.assert(retrievedPost);
  // 6. Validate post_type equals 'image', body is null, url is null
  TestValidator.equals("post_type is image", retrievedPost.post_type, "image");
  TestValidator.equals("body is null for image post", retrievedPost.body, null);
  TestValidator.equals("url is null for image post", retrievedPost.url, null);
  // 7. Validate postImage contains complete attachment metadata
  const postImage = typia.assert(retrievedPost.postImage!);
  TestValidator.predicate(
    "postImage.filename is non-empty",
    postImage.filename.length > 0,
  );
  TestValidator.predicate(
    "postImage.file_size_bytes is positive",
    postImage.file_size_bytes > 0,
  );
  TestValidator.predicate(
    "postImage.content_type is non-empty",
    postImage.content_type.length > 0,
  );
  // 8. Validate vote_score is 0 and comment_count is 0
  TestValidator.equals("vote_score is 0", retrievedPost.vote_score, 0);
  TestValidator.equals("comment_count is 0", retrievedPost.comment_count, 0);
  // 9. Validate postImage.post reference points back to the retrieved post summary
  TestValidator.equals(
    "postImage.post.id matches",
    postImage.post.id,
    retrievedPost.id,
  );
  TestValidator.equals(
    "postImage.post.title matches",
    postImage.post.title,
    retrievedPost.title,
  );
  TestValidator.equals(
    "postImage.post.post_type matches",
    postImage.post.post_type,
    retrievedPost.post_type,
  );
}
