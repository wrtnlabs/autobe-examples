import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_retrieval_link_image_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community (member needs to be authenticated)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: undefined,
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community (member needs to be authenticated)
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberConnection,
      {
        communityId: community.id,
        body: { confirmSubscription: true },
      },
    );
  typia.assert(subscription);
  // 4. Create LINK post (member needs to be authenticated)
  const linkTitle = "Test Link Post";
  const linkUrl = "https://example.com";
  const linkPost = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: linkTitle,
        postType: "LINK",
        redditPlatformCommunityId: community.id,
        content: null,
        url: linkUrl,
        imageUrl: null,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost);
  // 5. Create IMAGE post (member needs to be authenticated)
  const imageTitle = "Test Image Post";
  const imageUrl = "https://example.com/image.png";
  const imagePost = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: imageTitle,
        postType: "IMAGE",
        redditPlatformCommunityId: community.id,
        content: null,
        url: null,
        imageUrl: imageUrl,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(imagePost);
  // 6. Create TEXT post (member needs to be authenticated)
  const textTitle = "Test Text Post";
  const textContent = "This is the text content of the post.";
  const textPost = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: textTitle,
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: textContent,
        url: null,
        imageUrl: null,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(textPost);
  // 7. Retrieve LINK post (public, no auth needed)
  const retrievedLinkPost = await api.functional.redditPlatform.posts.at(
    connection,
    { postId: linkPost.id },
  );
  typia.assert(retrievedLinkPost);
  // 8. Retrieve IMAGE post (public, no auth needed)
  const retrievedImagePost = await api.functional.redditPlatform.posts.at(
    connection,
    { postId: imagePost.id },
  );
  typia.assert(retrievedImagePost);
  // 9. Retrieve TEXT post (public, no auth needed)
  const retrievedTextPost = await api.functional.redditPlatform.posts.at(
    connection,
    { postId: textPost.id },
  );
  typia.assert(retrievedTextPost);
  // 10. Validate LINK post
  TestValidator.equals("link post type", retrievedLinkPost.postType, "LINK");
  TestValidator.equals("link post url", retrievedLinkPost.url, linkUrl);
  TestValidator.equals("link post content", retrievedLinkPost.content, null);
  TestValidator.equals("link post image_url", retrievedLinkPost.imageUrl, null);
  TestValidator.equals("link post title", retrievedLinkPost.title, linkTitle);
  TestValidator.equals(
    "link post community",
    retrievedLinkPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "link post author",
    retrievedLinkPost.author.id,
    memberAuth.id,
  );
  // 11. Validate IMAGE post
  TestValidator.equals("image post type", retrievedImagePost.postType, "IMAGE");
  TestValidator.equals("image post url", retrievedImagePost.url, null);
  TestValidator.equals("image post content", retrievedImagePost.content, null);
  TestValidator.equals(
    "image post image_url",
    retrievedImagePost.imageUrl,
    imageUrl,
  );
  TestValidator.equals(
    "image post title",
    retrievedImagePost.title,
    imageTitle,
  );
  TestValidator.equals(
    "image post community",
    retrievedImagePost.community.id,
    community.id,
  );
  TestValidator.equals(
    "image post author",
    retrievedImagePost.author.id,
    memberAuth.id,
  );
  // 12. Validate TEXT post
  TestValidator.equals("text post type", retrievedTextPost.postType, "TEXT");
  TestValidator.equals("text post url", retrievedTextPost.url, null);
  TestValidator.equals(
    "text post content",
    retrievedTextPost.content,
    textContent,
  );
  TestValidator.equals("text post image_url", retrievedTextPost.imageUrl, null);
  TestValidator.equals("text post title", retrievedTextPost.title, textTitle);
  TestValidator.equals(
    "text post community",
    retrievedTextPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "text post author",
    retrievedTextPost.author.id,
    memberAuth.id,
  );
}
