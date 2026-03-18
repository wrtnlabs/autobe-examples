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
import { generate_random_community_platform_admin_posts_link_update_post_link } from "../../../generate/generate_random_community_platform_admin_posts_link_update_post_link";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";

export async function test_api_admin_update_post_link_representation_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authorization (actor-isolated connection)
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
  // 2) Create an initial link-type post (via provided generator utility)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const initialHref = typia.random<string & tags.Format<"uri">>();
  const initialDisplayTitle = RandomGenerator.name(3);
  const initialDisplayDescription = RandomGenerator.paragraph({ sentences: 2 });
  const title = RandomGenerator.name(3);
  await generate_random_community_platform_admin_posts_create(adminConnection, {
    body: {
      community_id: communityId,
      post_type: "link",
      title,
      link: {
        href: initialHref,
        display_title: initialDisplayTitle,
        display_description: initialDisplayDescription,
      },
    } satisfies ICommunityPlatformPost.ICreate,
  });
  // 3) Update link metadata and capture updated post representation
  const updatedHref = typia.random<string & tags.Format<"uri">>();
  const updatedDisplayTitle = RandomGenerator.name(3);
  const updatedDisplayDescription = RandomGenerator.paragraph({ sentences: 2 });
  // Use provided generator that returns an ICommunityPlatformPost
  // (it encapsulates link-update preparation and returns the updated post DTO).
  const postAfterFirstUpdate =
    await generate_random_community_platform_admin_posts_link_update_post_link(
      adminConnection,
      {
        // The generator will materialize a valid post context.
        params: { postId: typia.random<string & tags.Format<"uuid">>() },
        body: {
          href: initialHref,
          displayTitle: initialDisplayTitle,
          displayDescription: initialDisplayDescription,
        },
      },
    );
  typia.assert(postAfterFirstUpdate);
  const postId = postAfterFirstUpdate.id;
  const updatedPost =
    await api.functional.communityPlatform.admin.posts.link.updatePostLink(
      adminConnection,
      {
        postId,
        body: {
          href: updatedHref,
          displayTitle: updatedDisplayTitle,
          displayDescription: updatedDisplayDescription,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(updatedPost);
  // 4) Validate representation consistency based on available DTO fields
  TestValidator.equals("title unchanged", updatedPost.title, title);
  TestValidator.equals("post type remains link", updatedPost.postType, "link");
  // linkContent is typed as null in the provided DTO contract, so it must remain null.
  TestValidator.equals(
    "linkContent remains null in DTO contract",
    updatedPost.linkContent,
    null,
  );
}
