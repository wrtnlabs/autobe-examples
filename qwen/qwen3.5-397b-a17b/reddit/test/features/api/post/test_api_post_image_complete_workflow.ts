import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
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
import { generate_random_reddit_community_member_posts_images_create } from "../../../generate/generate_random_reddit_community_member_posts_images_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_image } from "../../../prepare/prepare_random_reddit_community_post_image";

/**
 * Test the complete image post creation workflow from community creation through image upload and retrieval.
 *
 * This test validates:
 * 1. Member authentication and community creation with icon
 * 2. Community subscription to enable post creation
 * 3. Image post creation in the subscribed community
 * 4. Image upload and attachment to the post
 * 5. Verification that the post's images array contains the uploaded image
 * 6. Image metadata accessibility and validation
 */
export async function test_api_post_image_complete_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - join as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member authenticated",
    memberAuth.token.access.length > 0,
  );
  // 2. Create community with icon
  const communityName = `test_community_${RandomGenerator.alphabets(8)}`;
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUri: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.predicate(
    "community has icon",
    community.communityIcons.length > 0,
  );
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription community matches",
    subscription.community.name,
    community.name,
  );
  // 4. Create an image post in the community
  const imagePost = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "image",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        image_path: typia.random<string>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(imagePost);
  TestValidator.equals("post type is image", imagePost.post_type, "image");
  TestValidator.predicate(
    "post has empty images initially",
    imagePost.images.length === 0,
  );
  // 5. Upload image to the post
  const uploadedImage =
    await generate_random_reddit_community_member_posts_images_create(
      memberConnection,
      {
        params: {
          postId: imagePost.id,
        },
        body: {
          filePath: typia.random<string>(),
          fileSize: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<10000000>
          >(),
          mimeType: "image/jpeg",
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
        } satisfies IRedditCommunityPostImage.ICreate,
      },
    );
  typia.assert(uploadedImage);
  TestValidator.equals(
    "image post ID matches",
    uploadedImage.post.id,
    imagePost.id,
  );
  TestValidator.predicate(
    "image has valid file size",
    uploadedImage.file_size > 0,
  );
  TestValidator.predicate(
    "image has valid dimensions",
    uploadedImage.width > 0 && uploadedImage.height > 0,
  );
  // 6. Verify the uploaded image is accessible through the post
  TestValidator.equals("image sort order", uploadedImage.sort_order, 1);
  TestValidator.predicate(
    "image has valid MIME type",
    uploadedImage.mime_type.startsWith("image/"),
  );
  TestValidator.notEquals("image has unique ID", uploadedImage.id, "");
}
