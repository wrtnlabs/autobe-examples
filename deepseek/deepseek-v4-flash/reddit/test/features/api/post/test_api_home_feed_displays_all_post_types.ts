import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_home_feed_displays_all_post_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe the member to the community
  await generate_random_community_platform_member_communities_subscribers_create(
    memberConnection,
    {
      params: { communityId: community.id },
    },
  );
  // 4. Create a text post with long body (>200 chars)
  const textPostBody = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const textPost = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: "Text Post - " + RandomGenerator.name(3),
        body: textPostBody,
      },
    },
  );
  typia.assert(textPost);
  // 5. Create a link post with a valid URL
  const linkPost = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        type: "link",
        title: "Link Post - " + RandomGenerator.name(3),
        url: "https://github.com",
      },
    },
  );
  typia.assert(linkPost);
  // 6. Create an image post with a valid image URI
  const imagePost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          type: "image",
          title: "Image Post - " + RandomGenerator.name(3),
          imageUri: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(imagePost);
  // 7. Request the Home Feed
  const feed =
    await api.functional.communityPlatform.member.posts.feeds.home.index(
      memberConnection,
      {
        body: {
          sort: "new",
          limit: 50,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(feed);
  // 8. Verify all three posts appear in the feed
  const textPostFromFeed = feed.data.find((p) => p.id === textPost.id);
  const linkPostFromFeed = feed.data.find((p) => p.id === linkPost.id);
  const imagePostFromFeed = feed.data.find((p) => p.id === imagePost.id);
  TestValidator.predicate(
    "text post appears in home feed",
    () => textPostFromFeed !== undefined,
  );
  TestValidator.predicate(
    "link post appears in home feed",
    () => linkPostFromFeed !== undefined,
  );
  TestValidator.predicate(
    "image post appears in home feed",
    () => imagePostFromFeed !== undefined,
  );
  // 9. Verify text_preview is populated and contains first 200 chars
  const got = textPostFromFeed!;
  TestValidator.predicate(
    "text_preview is defined for text post",
    () => got.text_preview !== undefined,
  );
  TestValidator.equals(
    "text_preview is first 200 chars of body",
    got.text_preview,
    textPostBody.substring(0, 200),
  );
  // 10. Verify image_url is populated for image post
  TestValidator.predicate(
    "image_url is defined for image post",
    () => imagePostFromFeed!.image_url !== undefined,
  );
  // 11. Verify domain_name is populated for link post
  TestValidator.predicate(
    "domain_name is defined for link post",
    () => linkPostFromFeed!.domain_name !== undefined,
  );
  // 12. Verify each post type only has its matching preview field
  TestValidator.equals("text post has no image_url", got.image_url, undefined);
  TestValidator.equals(
    "text post has no domain_name",
    got.domain_name,
    undefined,
  );
  TestValidator.equals(
    "link post has no text_preview",
    linkPostFromFeed!.text_preview,
    undefined,
  );
  TestValidator.equals(
    "link post has no image_url",
    linkPostFromFeed!.image_url,
    undefined,
  );
  TestValidator.equals(
    "image post has no text_preview",
    imagePostFromFeed!.text_preview,
    undefined,
  );
  TestValidator.equals(
    "image post has no domain_name",
    imagePostFromFeed!.domain_name,
    undefined,
  );
}
