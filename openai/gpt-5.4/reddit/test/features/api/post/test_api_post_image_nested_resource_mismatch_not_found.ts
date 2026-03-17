import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_images_create } from "../../../generate/generate_random_community_platform_member_posts_images_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_post_image_nested_resource_mismatch_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(authorized);
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const firstPost: ICommunityPlatformPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_platform_community_id: community.id,
          post_type: "image",
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(firstPost);
  const secondPost: ICommunityPlatformPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_platform_community_id: community.id,
          post_type: "image",
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(secondPost);
  typia.assert(
    await generate_random_community_platform_member_posts_images_create(
      memberConnection,
      {
        params: {
          postId: firstPost.id,
        },
        body: {
          storage_uri: typia.random<string & tags.Format<"uri">>(),
          original_name: `${RandomGenerator.alphabets(8)}.jpg`,
          mime_type: "image/jpeg",
          byte_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >() satisfies number as number,
          width: typia.random<
            number & tags.Type<"int32">
          >() satisfies number as number,
          height: typia.random<
            number & tags.Type<"int32">
          >() satisfies number as number,
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    ),
  );
  const secondImage: ICommunityPlatformPostImage =
    await generate_random_community_platform_member_posts_images_create(
      memberConnection,
      {
        params: {
          postId: secondPost.id,
        },
        body: {
          storage_uri: typia.random<string & tags.Format<"uri">>(),
          original_name: `${RandomGenerator.alphabets(8)}.png`,
          mime_type: "image/png",
          byte_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >() satisfies number as number,
          width: typia.random<
            number & tags.Type<"int32">
          >() satisfies number as number,
          height: typia.random<
            number & tags.Type<"int32">
          >() satisfies number as number,
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(secondImage);
  await TestValidator.httpError(
    "reject mismatched nested post image lookup with not found",
    404,
    async () => {
      await api.functional.communityPlatform.posts.images.at(memberConnection, {
        postId: firstPost.id,
        imageId: secondImage.id,
      });
    },
  );
}
