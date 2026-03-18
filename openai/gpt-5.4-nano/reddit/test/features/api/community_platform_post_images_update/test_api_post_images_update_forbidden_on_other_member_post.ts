import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostImageMutation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImageMutation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_images_update_forbidden_on_other_member_post(
  connection: api.IConnection,
): Promise<void> {
  // Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: undefined,
  });
  const communityA =
    await generate_random_community_platform_communities_create(
      memberAConnection,
      {
        body: undefined,
      },
    );
  await generate_random_community_platform_community_subscriptions_create(
    memberAConnection,
    {
      body: {
        community_id: communityA.id,
      },
    },
  );
  // Create an image post owned by member A (postId is not returned by the API signature)
  await api.functional.communityPlatform.member.posts.create(
    memberAConnection,
    {
      body: {
        community_id: communityA.id,
        post_type: "image",
        title: `img-${memberA.id}`,
        image: {
          image_cover_url: "https://example.com/cover.png",
          image_alt_text: "cover",
          attachments: [
            {
              file_url: "https://example.com/a.png",
              content_type: "image/png",
              file_size_bytes: 123,
              image_width_px: 10,
              image_height_px: 10,
              alt_text: "a",
              sort_order: 0,
            },
          ],
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // Member B setup
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: undefined,
  });
  const otherMemberPostId = typia.random<string & tags.Format<"uuid">>();
  // Member B attempts to update images for another member's post
  await TestValidator.httpError(
    "member B cannot update member A's post image attachments",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.member.posts.images.updateImages(
        memberBConnection,
        {
          postId: otherMemberPostId,
          body: {
            mutations: [
              {
                items: null,
              },
            ],
            page: null,
            limit: null,
          },
        },
      );
    },
  );
}
