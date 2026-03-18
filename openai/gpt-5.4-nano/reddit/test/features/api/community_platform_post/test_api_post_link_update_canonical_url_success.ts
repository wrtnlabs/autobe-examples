import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_admin_posts_create } from "../../../generate/generate_random_community_platform_admin_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_link_update_canonical_url_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authentication
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
  // 2) Create a link-type post
  const createdPostId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.communityPlatform.admin.posts.create(adminConnection, {
    body: {
      community_id: typia.random<string & tags.Format<"uuid">>(),
      post_type: "link",
      title: RandomGenerator.name(),
      link: {
        href: "https://example.com/original" satisfies string &
          tags.Format<"uri">,
        display_title: RandomGenerator.name(),
        display_description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    } satisfies ICommunityPlatformPost.ICreate,
  });
  // 3) Update canonical link URL (first)
  const href1 = "https://example.com/canonical-1" satisfies string &
    tags.Format<"uri">;
  const update1: ICommunityPlatformPost.IUpdateLink = {
    href: href1,
    display_title: RandomGenerator.name(),
    display_description: RandomGenerator.paragraph({ sentences: 1 }),
  };
  const updated1: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.posts.link.updateLink(
      adminConnection,
      {
        postId: createdPostId,
        body: update1,
      },
    );
  typia.assert(updated1);
  TestValidator.equals("postType is link", updated1.postType, "link");
  TestValidator.predicate(
    "editedAt is set",
    updated1.editedAt !== null && updated1.editedAt !== undefined,
  );
  const postedAt1 = updated1.postedAt;
  const editedAt1 = updated1.editedAt;
  TestValidator.equals(
    "canonical href persisted (stringified)",
    String(updated1.linkContent),
    href1,
  );
  // 4) Update canonical link URL (second)
  const href2 = "https://example.com/canonical-2" satisfies string &
    tags.Format<"uri">;
  const update2: ICommunityPlatformPost.IUpdateLink = {
    href: href2,
    display_title: RandomGenerator.name(),
    display_description: RandomGenerator.paragraph({ sentences: 1 }),
  };
  const updated2: ICommunityPlatformPost =
    await api.functional.communityPlatform.admin.posts.link.updateLink(
      adminConnection,
      {
        postId: createdPostId,
        body: update2,
      },
    );
  typia.assert(updated2);
  TestValidator.equals("postType still link", updated2.postType, "link");
  TestValidator.equals("postedAt unchanged", updated2.postedAt, postedAt1);
  TestValidator.notEquals("editedAt updated", updated2.editedAt, editedAt1);
  TestValidator.equals(
    "canonical href replaced (stringified)",
    String(updated2.linkContent),
    href2,
  );
}
