import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_home_feed_with_subscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // Step 2: Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  // Step 3: Subscribe to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    { communityId: community.id },
  );
  // Step 4: Create a text post
  const longTextContent =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.";
  const textPostCreate = {
    title: RandomGenerator.name(3),
    community_id: community.id,
    post_type: "text" as const,
    body: longTextContent,
  } satisfies IRedditLikePost.ICreate;
  const textPost = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    { body: textPostCreate },
  );
  // Step 5: Create a link post
  const linkUrl = "https://www.example.com/article/some-path";
  const linkPostCreate = {
    title: RandomGenerator.name(3),
    community_id: community.id,
    post_type: "link" as const,
    url: linkUrl,
  } satisfies IRedditLikePost.ICreate;
  const linkPost = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    { body: linkPostCreate },
  );
  // Step 6: Upload attachment and create an image post
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  const imagePostCreate = {
    title: RandomGenerator.name(3),
    community_id: community.id,
    post_type: "image" as const,
    attachment_id: attachment.id,
  } satisfies IRedditLikePost.ICreate;
  const imagePost = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    { body: imagePostCreate },
  );
  // Test Execution: Call home feed with default pagination
  const request: IRedditLikePost.IRequest = {
    page: 1,
    limit: 20,
    sort: "new",
  };
  const feed = await api.functional.redditLike.member.feeds.home.index(
    memberConnection,
    { body: request },
  );
  typia.assert(feed);
  // Validation:
  // Check that feed contains exactly our 3 posts from the subscribed community
  TestValidator.equals("feed should contain 3 posts", feed.data.length, 3);
  TestValidator.equals("pagination current page", feed.pagination.current, 1);
  TestValidator.equals("pagination limit", feed.pagination.limit, 20);
  TestValidator.equals("pagination records", feed.pagination.records, 3);
  TestValidator.equals("pagination pages", feed.pagination.pages, 1);
  // Find posts by type in the feed
  const textPostInFeed = feed.data.find((p) => p.post_type === "text");
  const linkPostInFeed = feed.data.find((p) => p.post_type === "link");
  const imagePostInFeed = feed.data.find((p) => p.post_type === "image");
  // Validate text post preview
  if (textPostInFeed === undefined) {
    throw new Error("Text post not found in feed");
  }
  TestValidator.equals(
    "text post title matches",
    textPostInFeed.title,
    textPost.title,
  );
  TestValidator.equals(
    "text post community matches",
    textPostInFeed.community.id,
    community.id,
  );
  TestValidator.equals(
    "text post author matches",
    textPostInFeed.author.id,
    member.id,
  );
  TestValidator.equals(
    "text post type is text",
    textPostInFeed.post_type,
    "text",
  );
  if (textPostInFeed.text_excerpt === null) {
    throw new Error("text_excerpt should not be null for text post");
  }
  TestValidator.equals(
    "text_excerpt is first 200 chars",
    textPostInFeed.text_excerpt,
    longTextContent.slice(0, 200),
  );
  TestValidator.equals(
    "text post link_domain is null",
    textPostInFeed.link_domain,
    null,
  );
  TestValidator.equals(
    "text post image_thumbnail_id is null",
    textPostInFeed.image_thumbnail_id,
    null,
  );
  // Validate link post preview
  if (linkPostInFeed === undefined) {
    throw new Error("Link post not found in feed");
  }
  TestValidator.equals(
    "link post title matches",
    linkPostInFeed.title,
    linkPost.title,
  );
  TestValidator.equals(
    "link post community matches",
    linkPostInFeed.community.id,
    community.id,
  );
  TestValidator.equals(
    "link post author matches",
    linkPostInFeed.author.id,
    member.id,
  );
  TestValidator.equals(
    "link post type is link",
    linkPostInFeed.post_type,
    "link",
  );
  const expectedDomain = new URL(linkUrl).hostname;
  if (linkPostInFeed.link_domain === null) {
    throw new Error("link_domain should not be null for link post");
  }
  TestValidator.equals(
    "link_domain matches URL domain",
    linkPostInFeed.link_domain,
    expectedDomain,
  );
  TestValidator.equals(
    "link post text_excerpt is null",
    linkPostInFeed.text_excerpt,
    null,
  );
  TestValidator.equals(
    "link post image_thumbnail_id is null",
    linkPostInFeed.image_thumbnail_id,
    null,
  );
  // Validate image post preview
  if (imagePostInFeed === undefined) {
    throw new Error("Image post not found in feed");
  }
  TestValidator.equals(
    "image post title matches",
    imagePostInFeed.title,
    imagePost.title,
  );
  TestValidator.equals(
    "image post community matches",
    imagePostInFeed.community.id,
    community.id,
  );
  TestValidator.equals(
    "image post author matches",
    imagePostInFeed.author.id,
    member.id,
  );
  TestValidator.equals(
    "image post type is image",
    imagePostInFeed.post_type,
    "image",
  );
  if (imagePostInFeed.image_thumbnail_id === null) {
    throw new Error("image_thumbnail_id should not be null for image post");
  }
  TestValidator.equals(
    "image_thumbnail_id is attachment id",
    imagePostInFeed.image_thumbnail_id,
    attachment.id,
  );
  TestValidator.equals(
    "image post text_excerpt is null",
    imagePostInFeed.text_excerpt,
    null,
  );
  TestValidator.equals(
    "image post link_domain is null",
    imagePostInFeed.link_domain,
    null,
  );
}
