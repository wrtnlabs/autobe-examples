import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
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
import { generate_random_community_platform_member_posts_images_create } from "../../../generate/generate_random_community_platform_member_posts_images_create";
import { generate_random_community_platform_member_posts_link_attach_post_link } from "../../../generate/generate_random_community_platform_member_posts_link_attach_post_link";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";

export async function test_api_posts_index_type_specific_previews_missing_metadata_handling(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const memberAuthConnection: api.IConnection = { host: connection.host };
  memberAuthConnection.headers ??= {};
  memberAuthConnection.headers.Authorization = authorized.token.access;
  const community = await generate_random_community_platform_communities_create(
    memberAuthConnection,
    {},
  );
  typia.assert(community);
  await generate_random_community_platform_community_subscriptions_create(
    memberAuthConnection,
    { body: { community_id: community.id } },
  );
  // Post A: link-type + link metadata exists
  const linkPostTitle = RandomGenerator.name();
  const linkHref = `https://example.com/${RandomGenerator.alphabets(6)}`;
  await generate_random_community_platform_member_posts_create(
    memberAuthConnection,
    {
      body: {
        community_id: community.id,
        post_type: "link",
        title: linkPostTitle,
        link: {
          href: linkHref satisfies string & tags.Format<"uri">,
          display_title: RandomGenerator.name(),
          display_description: RandomGenerator.paragraph({ sentences: 1 }),
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // Find Post A id for attaching link metadata
  const pageAfterA = await api.functional.communityPlatform.member.posts.index(
    memberAuthConnection,
    {
      body: {
        communityId: community.id,
        limit: 50,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(pageAfterA);
  const postA = pageAfterA.data.find(
    (p) => p.postType === "link" && p.title === linkPostTitle,
  );
  if (!postA) throw new Error("Post A summary not found");
  await generate_random_community_platform_member_posts_link_attach_post_link(
    memberAuthConnection,
    {
      params: { postId: postA.id },
      body: {
        href: linkHref satisfies string & tags.Format<"uri">,
        displayTitle: RandomGenerator.name(),
        displayDescription: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformPostLink.ICreate,
    },
  );
  // Post B: image-type + metadata present (via images endpoint)
  const postBTitle = RandomGenerator.name();
  const postBAlt = RandomGenerator.paragraph({ sentences: 1 });
  await generate_random_community_platform_member_posts_create(
    memberAuthConnection,
    {
      body: {
        community_id: community.id,
        post_type: "image",
        title: postBTitle,
        image: {
          image_cover_url:
            `https://images.example.com/${RandomGenerator.alphabets(8)}.png` satisfies string &
              tags.Format<"uri">,
          image_alt_text: postBAlt,
          attachments: [
            {
              file_url:
                `https://files.example.com/${RandomGenerator.alphabets(10)}.png` satisfies string &
                  tags.Format<"uri">,
              content_type: "image/png",
              file_size_bytes: 1024,
              image_width_px: 640,
              image_height_px: 480,
              alt_text: postBAlt,
              sort_order: 1,
            },
          ],
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  const pageAfterB = await api.functional.communityPlatform.member.posts.index(
    memberAuthConnection,
    {
      body: {
        communityId: community.id,
        limit: 50,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(pageAfterB);
  const postB = pageAfterB.data.find(
    (p) => p.postType === "image" && p.title === postBTitle,
  );
  if (!postB) throw new Error("Post B summary not found");
  await generate_random_community_platform_member_posts_images_create(
    memberAuthConnection,
    {
      params: { postId: postB.id },
      body: {
        file_url:
          `https://files.example.com/${RandomGenerator.alphabets(10)}.png` satisfies string &
            tags.Format<"uri">,
        content_type: "image/png",
        file_size_bytes: 2048,
        image_width_px: 800,
        image_height_px: 600,
        alt_text: postBAlt,
        sort_order: 2,
      } satisfies ICommunityPlatformPostImage.ICreate,
    },
  );
  // Post C: image-type with missing type-specific preview metadata (skip images endpoint)
  const postCTitle = RandomGenerator.name();
  const postCAlt = RandomGenerator.paragraph({ sentences: 1 });
  await generate_random_community_platform_member_posts_create(
    memberAuthConnection,
    {
      body: {
        community_id: community.id,
        post_type: "image",
        title: postCTitle,
        image: {
          image_cover_url:
            `https://images.example.com/${RandomGenerator.alphabets(8)}.png` satisfies string &
              tags.Format<"uri">,
          image_alt_text: postCAlt,
          attachments: [
            {
              file_url:
                `https://files.example.com/${RandomGenerator.alphabets(10)}.png` satisfies string &
                  tags.Format<"uri">,
              content_type: "image/png",
              file_size_bytes: 512,
              image_width_px: 320,
              image_height_px: 240,
              alt_text: postCAlt,
              sort_order: 1,
            },
          ],
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // Do NOT call generate_random_community_platform_member_posts_images_create for Post C.
  const finalPage = await api.functional.communityPlatform.member.posts.index(
    memberAuthConnection,
    {
      body: {
        communityId: community.id,
        limit: 50,
        page: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(finalPage);
  const postASummary = finalPage.data.find(
    (p) => p.postType === "link" && p.title === linkPostTitle,
  );
  const postBSummary = finalPage.data.find(
    (p) => p.postType === "image" && p.title === postBTitle,
  );
  const postCSummary = finalPage.data.find(
    (p) => p.postType === "image" && p.title === postCTitle,
  );
  if (!postASummary) throw new Error("Post A summary not present");
  if (!postBSummary) throw new Error("Post B summary not present");
  if (!postCSummary) throw new Error("Post C summary not present");
  TestValidator.equals(
    "Post A deletedAt is null",
    postASummary.deletedAt,
    null,
  );
  TestValidator.equals(
    "Post B deletedAt is null",
    postBSummary.deletedAt,
    null,
  );
  TestValidator.equals(
    "Post C deletedAt is null",
    postCSummary.deletedAt,
    null,
  );
  TestValidator.predicate(
    "Post A linkUrl should be present when link metadata exists",
    postASummary.linkUrl !== null,
  );
  if (postASummary.linkUrl !== null) {
    TestValidator.predicate(
      "Post A linkUrl should look like URL",
      /^https?:\/\//.test(postASummary.linkUrl),
    );
  }
  TestValidator.predicate(
    "Post B imageCoverUrl should be present when image metadata exists",
    postBSummary.imageCoverUrl !== null,
  );
  if (postBSummary.imageCoverUrl !== null) {
    TestValidator.predicate(
      "Post B imageCoverUrl should look like URL",
      /^https?:\/\//.test(postBSummary.imageCoverUrl),
    );
  }
  TestValidator.equals(
    "Post C imageCoverUrl should be null when image metadata is missing",
    postCSummary.imageCoverUrl,
    null,
  );
}
