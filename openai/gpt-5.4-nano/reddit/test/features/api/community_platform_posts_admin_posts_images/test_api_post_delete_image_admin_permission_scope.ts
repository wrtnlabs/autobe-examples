import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_images_create } from "../../../generate/generate_random_community_platform_member_posts_images_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_delete_image_admin_permission_scope(
  connection: api.IConnection,
): Promise<void> {
  // Create Community A
  const communityAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(communityAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const communityA =
    await generate_random_community_platform_communities_create(
      communityAConnection,
      {},
    );

  // Create moderator candidate and assign to Community A
  const moderatorCandidateConnection: api.IConnection = {
    host: connection.host,
  };
  const moderatorCandidateAuth = await authorize_member_join(
    moderatorCandidateConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  await generate_random_community_platform_community_moderators_create(
    communityAConnection,
    {
      body: {
        communityId: communityA.id,
        moderatorUserId: moderatorCandidateAuth.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );

  // Create Community B
  const communityBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(communityBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const communityB =
    await generate_random_community_platform_communities_create(
      communityBConnection,
      {},
    );

  // Create a post+image in each community.
  const authorAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  await generate_random_community_platform_member_posts_create(
    authorAConnection,
    {
      body: {
        community_id: communityA.id,
        post_type: "image",
        title: RandomGenerator.name(),
        image: {
          image_cover_url: "https://example.com/cover.png",
          image_alt_text: "alt",
          attachments: [
            {
              file_url: "https://example.com/file.png",
              content_type: "image/png",
              file_size_bytes: 1024,
              image_width_px: 100,
              image_height_px: 100,
              alt_text: "alt",
              sort_order: 0,
            },
          ] satisfies ICommunityPlatformPostImage.ICreate[],
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );

  const authorBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  await generate_random_community_platform_member_posts_create(
    authorBConnection,
    {
      body: {
        community_id: communityB.id,
        post_type: "image",
        title: RandomGenerator.name(),
        image: {
          image_cover_url: "https://example.com/cover.png",
          image_alt_text: "alt",
          attachments: [
            {
              file_url: "https://example.com/file.png",
              content_type: "image/png",
              file_size_bytes: 1024,
              image_width_px: 100,
              image_height_px: 100,
              alt_text: "alt",
              sort_order: 0,
            },
          ] satisfies ICommunityPlatformPostImage.ICreate[],
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );

  // Admin auth: join then login
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminJoinConnection, {
    body: adminCredentials,
  });

  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  const postIdA = typia.random<string & tags.Format<"uuid">>();
  const imageIdA = typia.random<string & tags.Format<"uuid">>();
  const postIdB = typia.random<string & tags.Format<"uuid">>();
  const imageIdB = typia.random<string & tags.Format<"uuid">>();

  await api.functional.communityPlatform.admin.posts.images.erasePostImage(
    adminConnection,
    {
      postId: postIdA,
      imageId: imageIdA,
    },
  );

  await TestValidator.error(
    "deleted image should not be deletable again",
    async () => {
      await api.functional.communityPlatform.admin.posts.images.erasePostImage(
        adminConnection,
        {
          postId: postIdA,
          imageId: imageIdA,
        },
      );
    },
  );

  await api.functional.communityPlatform.admin.posts.images.erasePostImage(
    adminConnection,
    {
      postId: postIdB,
      imageId: imageIdB,
    },
  );
}
