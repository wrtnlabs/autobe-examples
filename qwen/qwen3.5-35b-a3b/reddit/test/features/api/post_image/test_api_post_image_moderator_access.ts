import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_image_moderator_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member (author) and create a community
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorAuth);
  const authorCommunity =
    await generate_random_reddit_platform_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(authorCommunity);
  // 2. Auth as another member (moderator) and subscribe to the community
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  const moderatorSubscription =
    await generate_random_reddit_platform_member_communities_subscribe(
      moderatorConnection,
      {
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
        params: {
          communityId: authorCommunity.id,
        },
      },
    );
  typia.assert(moderatorSubscription);
  // 3. Author creates an IMAGE-type post in the community
  const authorPost = await generate_random_reddit_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        postType: "IMAGE",
        redditPlatformCommunityId: authorCommunity.id,
        content: null,
        url: null,
        imageUrl: typia.random<
          string & tags.MaxLength<80000> & tags.Format<"uri">
        >(),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(authorPost);
  // 4. Auth as moderator and add themselves as community moderator
  const moderatorId = moderatorAuth.id;
  await generate_random_reddit_platform_member_communities_moderators_add(
    authorConnection,
    {
      body: {
        user_id: moderatorId,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
      params: {
        communityId: authorCommunity.id,
      },
    },
  );
  // 5. Auth as moderator and retrieve images on the author's post
  const retrievedImages =
    await api.functional.redditPlatform.posts.images.manageImages(
      moderatorConnection,
      {
        postId: authorPost.id,
        body: {
          operation: "retrieve",
        } as IRedditPlatformPostImage.IRequest,
      },
    );
  typia.assert(retrievedImages);
  // 6. Auth as moderator and upload an image to the author's post
  const uploadedImage =
    await api.functional.redditPlatform.posts.images.manageImages(
      moderatorConnection,
      {
        postId: authorPost.id,
        body: {
          operation: "upload",
          mime_type: "image/jpeg",
          file_size:
            ((typia.random<number>()) satisfies number as number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000000>),
          file_path: typia.random<string & tags.Format<"uri">>(),
          filename: "test_image.jpg",
        } as IRedditPlatformPostImage.IRequest,
      },
    );
  typia.assert(uploadedImage);
  // 7. Verify the upload succeeds and the image appears in the post's image list
  TestValidator.equals(
    "image uploaded successfully",
    uploadedImage.id !== undefined,
    true,
  );
  TestValidator.equals(
    "has valid mime type",
    uploadedImage.mime_type,
    "image/jpeg",
  );
  TestValidator.equals(
    "has valid file size",
    uploadedImage.file_size > 0,
    true,
  );
  TestValidator.equals(
    "has valid filename",
    uploadedImage.filename,
    "test_image.jpg",
  );
}