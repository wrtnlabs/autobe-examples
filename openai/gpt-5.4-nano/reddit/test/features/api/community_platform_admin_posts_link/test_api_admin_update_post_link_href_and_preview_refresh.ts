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

export async function test_api_admin_update_post_link_href_and_preview_refresh(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const href1 = "https://example.com/old-path" satisfies string &
    tags.Format<"uri">;
  const href2 = "https://example.com/new-path" satisfies string &
    tags.Format<"uri">;
  const href3 = "https://another-domain.test/abc" satisfies string &
    tags.Format<"uri">;
  const previewText = RandomGenerator.paragraph({ sentences: 2 });
  // Scenario 1: create eligible link-type post
  const linkCreateInput = {
    post_type: "link",
    title: RandomGenerator.name(),
    body_text: undefined,
    community_id: typia.random<string & tags.Format<"uuid">>(),
    link: {
      href: href1,
      display_title: RandomGenerator.name(),
      display_description: previewText,
    },
  } satisfies ICommunityPlatformPost.ICreate;
  await generate_random_community_platform_admin_posts_create(adminConnection, {
    body: linkCreateInput,
  });
  // Update: validate response contract for link-type rendering semantics
  const updated1 =
    await generate_random_community_platform_admin_posts_link_update_post_link(
      adminConnection,
      {
        params: { postId: typia.random<string & tags.Format<"uuid">>() },
        body: {
          href: href2,
          displayTitle: RandomGenerator.name(),
          displayDescription: previewText,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(updated1);
  TestValidator.equals(
    "scenario1: postType is link",
    updated1.postType,
    "link",
  );
  TestValidator.predicate(
    "scenario1: editedAt is non-null or updatedAt is non-empty",
    updated1.editedAt !== null || updated1.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "scenario1: linkContent present for link posts",
    updated1.linkContent !== null,
  );
  // Scenario 2: update href to a different domain
  const updated2 =
    await generate_random_community_platform_admin_posts_link_update_post_link(
      adminConnection,
      {
        params: { postId: typia.random<string & tags.Format<"uuid">>() },
        body: {
          href: href3,
          displayTitle: RandomGenerator.name(),
          displayDescription: previewText,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(updated2);
  TestValidator.equals(
    "scenario2: postType is link",
    updated2.postType,
    "link",
  );
  TestValidator.predicate(
    "scenario2: linkContent present for link posts",
    updated2.linkContent !== null,
  );
  // Scenario 3: non-link post should not have linkContent persisted
  const nonLinkAfter =
    await generate_random_community_platform_admin_posts_link_update_post_link(
      adminConnection,
      {
        params: { postId: typia.random<string & tags.Format<"uuid">>() },
        body: {
          href: href2,
          displayTitle: RandomGenerator.name(),
          displayDescription: previewText,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(nonLinkAfter);
  TestValidator.equals(
    "scenario3: linkContent is null",
    nonLinkAfter.linkContent,
    null,
  );
}
