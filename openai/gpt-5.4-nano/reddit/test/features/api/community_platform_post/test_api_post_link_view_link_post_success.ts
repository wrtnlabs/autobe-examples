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

export async function test_api_post_link_view_link_post_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authenticated context
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(admin);

  // 2) Create a link-type post and obtain postId
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const displayTitle = RandomGenerator.name();
  const displayDescription = RandomGenerator.paragraph({ sentences: 2 });

  const post = typia.assert<ICommunityPlatformPost>(
    await api.functional.communityPlatform.admin.posts.create(
      adminConnection,
      {
        body: {
          community_id: communityId,
          post_type: "link",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          link: {
            href,
            display_title: displayTitle,
            display_description: displayDescription,
          },
        } satisfies ICommunityPlatformPost.ICreate,
      },
    ),
  );

  // 3) Explicitly attach/update canonical link metadata
  const canonicalHref = typia.random<string & tags.Format<"uri">>();
  const updatedTitle = RandomGenerator.name();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updatedPost = typia.assert(
    await api.functional.communityPlatform.admin.posts.link.attachPostLink(
      adminConnection,
      {
        postId: post.id,
        body: {
          href: canonicalHref,
          displayTitle: updatedTitle,
          displayDescription: updatedDescription,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    ),
  );

  // 4) Retrieve link representation
  const link = typia.assert(
    await api.functional.communityPlatform.admin.posts.link.at(
      adminConnection,
      {
        postId: updatedPost.id,
      },
    ),
  );

  // Validations
  TestValidator.equals("href matches canonical href", link.href, canonicalHref);
  TestValidator.equals(
    "display_title matches",
    link.display_title,
    updatedTitle,
  );
  TestValidator.equals(
    "display_description matches",
    link.display_description,
    updatedDescription,
  );
  TestValidator.equals("deleted_at is null", link.deleted_at, null);
}
