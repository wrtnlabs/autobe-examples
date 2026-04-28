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
 * Validates the complete workflow for retrieving image attachment metadata for a valid image-type post.
 *
 * The test registers and authenticates a member, creates a community, subscribes to it, then creates an image-type post with an uploaded image. The public image retrieval endpoint is called with the post's UUID.
 *
 * The endpoint should return complete image metadata including: image_url (HTTPS URI), filename, file_size_bytes, content_type (valid image MIME type like image/jpeg, image/png, or image/webp), and a summary reference to the parent post via the post relationship.
 *
 * This confirms the business flow from member registration through image post creation to public image metadata access, validating that image-type posts properly have associated image attachments that are publicly retrievable.
 *
 * 1. Register and authenticate as a member.
 * 2. Create a community.
 * 3. Subscribe to the community.
 * 4. Create an image-type post (post_type: 'image').
 * 5. Retrieve the post's image attachment metadata using the post's UUID.
 * 6. Validate image metadata fields match expected image attachment metadata.
 */
export async function test_api_post_image_retrieval_valid_image_post(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create an image-type post (post_type: 'image')
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "image",
        community_id: community.id,
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Retrieve the post's image attachment metadata using the post's UUID
  const image = await api.functional.redditLikeCommunity.posts.image.at(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(image);
  // 6. Validate image metadata fields match expected image attachment metadata
  TestValidator.equals(
    "image URL is HTTPS",
    image.image_url.startsWith("https://"),
    true,
  );
  TestValidator.predicate("filename is present", image.filename.length > 0);
  TestValidator.predicate("file size is positive", image.file_size_bytes > 0);
  TestValidator.equals(
    "content type is valid image MIME type",
    ["image/jpeg", "image/png", "image/webp"].includes(image.content_type),
    true,
  );
  TestValidator.equals("post reference matches", image.post.id, post.id);
}
