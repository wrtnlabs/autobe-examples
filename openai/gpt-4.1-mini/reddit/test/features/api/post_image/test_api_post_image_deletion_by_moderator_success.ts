import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_images_create_post_image } from "../../../generate/generate_random_community_platform_user_posts_images_create_post_image";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_image_deletion_by_moderator_success(
  connection: api.IConnection,
): Promise<void> {
  // Test deletion of a post image by a community moderator who is not the original author.
  // Original author user join
  const originalUserConnection: api.IConnection = { host: connection.host };
  const originalUser = await authorize_user_join(originalUserConnection, {});
  typia.assert(originalUser);
  // Create community by original author
  const community =
    await generate_random_community_platform_user_communities_create(
      originalUserConnection,
      {},
    );
  typia.assert(community);
  // Create a post in the community by original author
  // postType is 'image' so we can upload post image
  const postBody = {
    title: "Test Post for Image Deletion",
    postType: "image",
  };
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      originalUserConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // Upload image to the post by original author
  const uploadedImage =
    await generate_random_community_platform_user_posts_images_create_post_image(
      originalUserConnection,
      {
        params: { postId: post.id },
        body: {},
      },
    );
  typia.assert(uploadedImage);
  // Moderator join with password
  const moderatorPassword = "ModPass123!";
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<string & tags.Format<"email">>();
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      displayName: "Moderator",
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(moderator);
  // Moderator login
  const moderatorAuthorized = await authorize_moderator_login(
    moderatorConnection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      },
    },
  );
  typia.assert(moderatorAuthorized);
  // Assume the moderator has the moderation role to delete images for this community
  // Delete the image
  await api.functional.communityPlatform.user.posts.images.eraseImage(
    moderatorConnection,
    {
      postId: post.id,
      imageId: uploadedImage.id,
    },
  );
  // Deletion returns no content (void), so no response assertion required
}
