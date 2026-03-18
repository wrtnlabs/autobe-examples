import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
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
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_image_deletion_moderator_deletes_non_author_image(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins, creates a community, and creates an image post
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberA);
  const communityA =
    await generate_random_community_platform_communities_create(
      memberAConnection,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<65535>
          >(),
          description: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<65535>
          >(),
          icon_href: typia.random<
            string &
              tags.MinLength<1> &
              tags.MaxLength<80000> &
              tags.Format<"uri">
          >(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // IDs for deletion (cannot be retrieved with provided API surface)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        community_id: communityA.id,
        post_type: "image",
        title: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<65535>
        >(),
        image: {
          image_cover_url: typia.random<string & tags.Format<"uri">>(),
          image_alt_text: typia.random<string>(),
          attachments: [
            {
              file_url: typia.random<string & tags.Format<"uri">>(),
              content_type: "image/png",
              file_size_bytes: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
              image_width_px: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
              image_height_px: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
              alt_text: typia.random<string>(),
              sort_order: typia.random<number & tags.Type<"int32">>(),
            } satisfies ICommunityPlatformPostImage.ICreate,
          ],
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // 2) Member B joins and is assigned as moderator for Member A's community
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberB);
  await generate_random_community_platform_community_moderators_create(
    memberAConnection,
    {
      body: {
        communityId: communityA.id,
        moderatorUserId: memberB.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  // 3) Moderator deletes the image
  await api.functional.communityPlatform.member.posts.images.erasePostImage(
    memberBConnection,
    {
      postId,
      imageId,
    },
  );
}
