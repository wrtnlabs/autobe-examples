import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentThumbnail";
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
import { generate_random_reddit_like_member_attachments_generate_thumbnails_generate_thumbnails } from "../../../generate/generate_random_reddit_like_member_attachments_generate_thumbnails_generate_thumbnails";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_attachment_thumbnail } from "../../../prepare/prepare_random_reddit_like_attachment_thumbnail";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test the Popular Feed endpoint's handling of different post types and their corresponding preview data.
 * Verifies that the feed correctly extracts and returns type-specific content previews: text excerpts
 * (first 200 characters), link domains, and image thumbnail references.
 */
export async function test_api_popular_feed_post_type_previews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(community);
  // 3. Subscribe to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    { communityId: community.id },
  );
  // 4. Create a text post with body exceeding 200 characters
  const longTextBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    wordMin: 3,
    wordMax: 8,
  });
  const textPost = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        community_id: community.id,
        post_type: "text",
        body: longTextBody,
      },
    },
  );
  typia.assert(textPost);
  // 5. Create a link post with a URL
  const linkUrl = "https://github.com/example/repo";
  const linkPost = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        community_id: community.id,
        post_type: "link",
        url: linkUrl,
      },
    },
  );
  typia.assert(linkPost);
  // 6. Upload an image attachment
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(attachment);
  // 7. Generate thumbnail for the uploaded image
  const thumbnail =
    await generate_random_reddit_like_member_attachments_generate_thumbnails_generate_thumbnails(
      memberConnection,
      {
        body: {
          width: 200,
          height: 200,
          quality: 80,
          format: "jpeg",
        } satisfies IRedditLikeAttachmentThumbnail.ICreate,
        params: { attachmentId: attachment.id },
      },
    );
  typia.assert(thumbnail);
  // 8. Create an image post referencing the uploaded attachment
  const imagePost = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        community_id: community.id,
        post_type: "image",
        attachment_id: attachment.id,
      },
    },
  );
  typia.assert(imagePost);
  // 9. Call the Popular Feed endpoint with sort='new' and large limit to get all posts
  const feedResponse =
    await api.functional.redditLike.member.feeds.popular.index(
      memberConnection,
      {
        body: {
          sort: "new",
          limit: 100,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(feedResponse);
  // Find our three posts in the feed
  const textPostInFeed = feedResponse.data.find((p) => p.id === textPost.id);
  const linkPostInFeed = feedResponse.data.find((p) => p.id === linkPost.id);
  const imagePostInFeed = feedResponse.data.find((p) => p.id === imagePost.id);
  // 10. Validate cross-field consistency
  // Text post validation
  TestValidator.predicate(
    "text post exists in feed",
    () => textPostInFeed !== undefined,
  );
  if (textPostInFeed) {
    // typia.assert validates all type constraints including post_type, text_excerpt format, link_domain, image_thumbnail_id
    typia.assert(textPostInFeed);
    TestValidator.equals(
      "text post type is 'text'",
      textPostInFeed.post_type,
      "text",
    );
    TestValidator.predicate(
      "text excerpt is populated for text post",
      () => textPostInFeed.text_excerpt !== null,
    );
    TestValidator.predicate("text excerpt from body", () => {
      if (textPostInFeed.text_excerpt === null) return false;
      return longTextBody.startsWith(textPostInFeed.text_excerpt);
    });
    TestValidator.predicate("text excerpt max 200 chars", () => {
      if (textPostInFeed.text_excerpt === null) return false;
      return textPostInFeed.text_excerpt.length <= 200;
    });
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
  }
  // Link post validation
  TestValidator.predicate(
    "link post exists in feed",
    () => linkPostInFeed !== undefined,
  );
  if (linkPostInFeed) {
    typia.assert(linkPostInFeed);
    TestValidator.equals(
      "link post type is 'link'",
      linkPostInFeed.post_type,
      "link",
    );
    TestValidator.equals(
      "link domain extracted correctly",
      linkPostInFeed.link_domain,
      "github.com",
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
  }
  // Image post validation
  TestValidator.predicate(
    "image post exists in feed",
    () => imagePostInFeed !== undefined,
  );
  if (imagePostInFeed) {
    typia.assert(imagePostInFeed);
    TestValidator.equals(
      "image post type is 'image'",
      imagePostInFeed.post_type,
      "image",
    );
    TestValidator.predicate(
      "image post has valid thumbnail",
      () => imagePostInFeed.image_thumbnail_id !== null,
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
}
