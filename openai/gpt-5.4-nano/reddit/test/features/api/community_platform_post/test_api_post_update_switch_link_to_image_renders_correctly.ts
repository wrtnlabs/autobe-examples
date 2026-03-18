import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_posts_create } from "../../../generate/generate_random_community_platform_admin_posts_create";
import { generate_random_community_platform_admin_posts_link_attach_post_link } from "../../../generate/generate_random_community_platform_admin_posts_link_attach_post_link";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";

export async function test_api_post_update_switch_link_to_image_renders_correctly(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const linkPost =
    await api.functional.communityPlatform.admin.posts.link.attachPostLink(
      adminConnection,
      {
        postId,
        body: {
          href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
          displayTitle: RandomGenerator.name(2),
          displayDescription: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  const linkTyped = typia.assert(linkPost);
  TestValidator.equals(
    "postType after attach link",
    linkTyped.postType,
    "link",
  );
  const updated = await api.functional.communityPlatform.admin.posts.update(
    adminConnection,
    {
      postId,
      body: {
        title: RandomGenerator.name(3),
        body: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "image",
        link_url: null,
        image_cover_url: `https://images.example.com/${RandomGenerator.alphaNumeric(8)}.png`,
        image_alt_text: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformPost.IUpdate,
    },
  );
  const res = typia.assert(updated);
  TestValidator.equals("postType is image", res.postType, "image");
  TestValidator.equals("linkContent cleared", res.linkContent, null);
  TestValidator.predicate("editedAt is not null", res.editedAt !== null);
  TestValidator.equals("imageContent neutral", res.imageContent, null);
  TestValidator.equals("imageAltText neutral", res.imageAltText, null);
}
