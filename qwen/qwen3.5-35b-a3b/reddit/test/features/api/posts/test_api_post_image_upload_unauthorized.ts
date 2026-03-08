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
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_posts_images_create_image } from "../../../generate/generate_random_reddit_platform_member_posts_images_create_image";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_image } from "../../../prepare/prepare_random_reddit_platform_post_image";

export async function test_api_post_image_upload_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate Member A (post author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberA);
  // 2. Create a community as Member A
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1> & tags.MaxLength<20>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe Member A to the community
  await generate_random_reddit_platform_member_communities_subscribe(
    memberAConnection,
    {
      params: { communityId: community.id },
      body: { confirmSubscription: true },
    },
  );
  // 4. Create an IMAGE-type post as Member A
  const post = await generate_random_reddit_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "IMAGE" as const,
        redditPlatformCommunityId: community.id,
        imageUrl: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      },
    },
  );
  typia.assert(post);
  // 5. Create and authenticate Member B (non-author)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberB);
  // 6. Attempt to upload an image to Member A's post as Member B (should fail)
  await TestValidator.httpError(
    "non-author cannot upload image to post",
    [403],
    async () => {
      await api.functional.redditPlatform.member.posts.images.createImage(
        memberBConnection,
        {
          postId: post.id,
          body: {
            filename: RandomGenerator.name(),
            mime_type: "image/jpeg" as const,
            file_size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<10485760>
            >(),
          },
        },
      );
    },
  );
  // 7. Verify post author (Member A) can still upload images to their own post
  const uploadedImage =
    await api.functional.redditPlatform.member.posts.images.createImage(
      memberAConnection,
      {
        postId: post.id,
        body: {
          filename: RandomGenerator.name(),
          mime_type: "image/png" as const,
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<10485760>
          >(),
        },
      },
    );
  typia.assert(uploadedImage);
  TestValidator.equals(
    "image uploaded by author",
    uploadedImage.post_id,
    post.id,
  );
}