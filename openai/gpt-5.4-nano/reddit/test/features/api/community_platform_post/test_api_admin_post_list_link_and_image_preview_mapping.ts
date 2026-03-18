import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
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
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_admin_post_list_link_and_image_preview_mapping(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminHref = "https://example.com/admin" satisfies string &
    tags.Format<"uri">;
  const adminReferrer = "https://example.com/admin/ref" satisfies string &
    tags.Format<"uri">;
  const adminIp = "127.0.0.1" satisfies string & tags.Format<"ipv4">;
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
      ip: adminIp,
    },
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  const memberHref = "https://example.com/member" satisfies string &
    tags.Format<"uri">;
  const memberReferrer = "https://example.com/member/ref" satisfies string &
    tags.Format<"uri">;
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: memberHref,
      referrer: memberReferrer,
    },
  });
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: `comm-${RandomGenerator.alphaNumeric(10)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: "https://example.com/icon.png" satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<80000>,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  await generate_random_community_platform_community_subscriptions_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  const linkHref = "https://example.com/link" satisfies string &
    tags.Format<"uri">;
  const linkDisplayTitle = `link-title-${RandomGenerator.alphaNumeric(8)}`;
  const linkDisplayDescription = `link-desc-${RandomGenerator.alphaNumeric(10)}`;
  const imageCoverUrl = "https://example.com/cover.png" satisfies string &
    tags.Format<"uri">;
  const imageAltText = `alt-${RandomGenerator.alphaNumeric(9)}`;
  const attachment: ICommunityPlatformPostImage.ICreate = {
    file_url: "https://example.com/att.png" satisfies string &
      tags.Format<"uri">,
    content_type: "image/png",
    file_size_bytes: typia.random<number & tags.Type<"int32">>(),
    image_width_px: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    image_height_px: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    alt_text: `att-alt-${RandomGenerator.alphaNumeric(7)}`,
    sort_order: 0 satisfies number & tags.Type<"int32">,
  };
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "link",
        title: `link-title-${RandomGenerator.alphaNumeric(6)}`,
        link: {
          href: linkHref,
          display_title: linkDisplayTitle,
          display_description: linkDisplayDescription,
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "image",
        title: `image-title-${RandomGenerator.alphaNumeric(6)}`,
        image: {
          image_cover_url: imageCoverUrl,
          image_alt_text: imageAltText,
          attachments: [attachment],
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  const pageSize = 10 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const pageNumber = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const linkPage = await api.functional.communityPlatform.admin.posts.index(
    adminConnection,
    {
      body: {
        communityId: community.id,
        postType: "link",
        page: pageNumber,
        limit: pageSize,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(linkPage);
  const linkItem = linkPage.data.find(
    (p) => p.postType === "link" && p.linkUrl === linkHref,
  );
  TestValidator.predicate(
    "should include link post in response",
    () => linkItem !== undefined,
  );
  if (!linkItem) throw new Error("link post not found");
  TestValidator.equals("linkUrl maps href", linkItem.linkUrl, linkHref);
  TestValidator.equals(
    "imageCoverUrl null for link post",
    linkItem.imageCoverUrl,
    null,
  );
  TestValidator.equals(
    "imageAltText null for link post",
    linkItem.imageAltText,
    null,
  );
  const imagePage = await api.functional.communityPlatform.admin.posts.index(
    adminConnection,
    {
      body: {
        communityId: community.id,
        postType: "image",
        page: pageNumber,
        limit: pageSize,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(imagePage);
  const imageItem = imagePage.data.find(
    (p) => p.postType === "image" && p.imageCoverUrl === imageCoverUrl,
  );
  TestValidator.predicate(
    "should include image post in response",
    () => imageItem !== undefined,
  );
  if (!imageItem) throw new Error("image post not found");
  TestValidator.equals(
    "imageCoverUrl maps cover url",
    imageItem.imageCoverUrl,
    imageCoverUrl,
  );
  TestValidator.equals(
    "imageAltText maps alt text",
    imageItem.imageAltText,
    imageAltText,
  );
  TestValidator.equals("linkUrl null for image post", imageItem.linkUrl, null);
}
