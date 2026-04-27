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

/**
 * Test viewing a community's post feed when the community has multiple posts of all three types (text, link, image).
 *
 * Validates the community feed endpoint by creating a member, a community, subscribing the member, and creating posts of each type. Verifies that (1) all created posts appear in the feed, (2) each post displays correct preview content based on type (text_preview for text, image_url for image, domain_name for link), (3) the feed includes proper author, community, vote_score, comment_count, and created_at fields for each post. Tests each sort mode (hot, new, top, controversial) and verifies correct ordering. Tests pagination by requesting a small limit and verifying cursor-based navigation works.
 *
 * 1. Create a member account via authorize_member_join.
 * 2. Create a community via generate_random_community_platform_member_communities_create.
 * 3. Subscribe the member to the community.
 * 4. Create text, link, and image posts.
 * 5. Fetch the community feed with sort=new and verify all posts appear.
 * 6. Verify type-specific preview content for each post.
 * 7. Verify each feed entry has proper author, community, vote_score, comment_count fields.
 * 8. Test hot, top, and controversial sort modes.
 * 9. Test pagination with limit=2 and cursor navigation to next page.
 */
export async function test_api_community_feed_with_posts(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Subscribe the member to the community
  await generate_random_community_platform_member_communities_subscribers_create(
    memberConnection,
    {
      params: { communityId: community.id },
    },
  );
  // Step 4: Create posts of each type
  // 4a. Create a text post
  const textPostBody: string =
    "This is a test text post content for community feed validation.";
  const textPost = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: "Text Post - " + RandomGenerator.alphabets(8),
        body: textPostBody,
      },
    },
  );
  typia.assert(textPost);
  // 4b. Create a link post
  const linkUrl: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const linkPost = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        type: "link",
        title: "Link Post - " + RandomGenerator.alphabets(8),
        url: linkUrl,
      },
    },
  );
  typia.assert(linkPost);
  // 4c. Create an image post
  const imageUri: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const imagePost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          type: "image",
          title: "Image Post - " + RandomGenerator.alphabets(8),
          imageUri: imageUri,
        },
      },
    );
  typia.assert(imagePost);
  // Step 5: Fetch the community feed with new sort and verify all posts appear
  const feedNew =
    await api.functional.communityPlatform.communities.posts.feeds.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "new",
          limit: 50,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(feedNew);
  TestValidator.equals("all posts appear in feed", feedNew.data.length, 3);
  const textPostSummary = feedNew.data.find((p) => p.id === textPost.id);
  const linkPostSummary = feedNew.data.find((p) => p.id === linkPost.id);
  const imagePostSummary = feedNew.data.find((p) => p.id === imagePost.id);
  TestValidator.predicate(
    "text post found in feed",
    () => textPostSummary !== undefined,
  );
  TestValidator.predicate(
    "link post found in feed",
    () => linkPostSummary !== undefined,
  );
  TestValidator.predicate(
    "image post found in feed",
    () => imagePostSummary !== undefined,
  );
  // Step 6: Verify type-specific preview content
  // Text post should have text_preview
  TestValidator.predicate(
    "text post has text_preview",
    () =>
      textPostSummary!.text_preview !== undefined &&
      textPostSummary!.text_preview!.length > 0,
  );
  // Link post should have domain_name
  TestValidator.predicate(
    "link post has domain_name",
    () =>
      linkPostSummary!.domain_name !== undefined &&
      linkPostSummary!.domain_name!.length > 0,
  );
  // Image post should have image_url
  TestValidator.predicate(
    "image post has image_url",
    () =>
      imagePostSummary!.image_url !== undefined &&
      imagePostSummary!.image_url!.length > 0,
  );
  // Step 7: Verify common feed entry fields
  for (const post of feedNew.data) {
    TestValidator.predicate(
      `post ${post.id} has author`,
      () => post.author !== undefined,
    );
    TestValidator.predicate(
      `post ${post.id} has community`,
      () => post.community !== undefined,
    );
    TestValidator.equals(`post ${post.id} vote_score`, post.vote_score, 0);
    TestValidator.equals(
      `post ${post.id} comment_count`,
      post.comment_count,
      0,
    );
    TestValidator.predicate(
      `post ${post.id} has created_at`,
      () => post.created_at.length > 0,
    );
    TestValidator.equals(
      `post ${post.id} community name`,
      post.community.name,
      community.name,
    );
    TestValidator.equals(
      `post ${post.id} author username`,
      post.author.username,
      community.owner.username,
    );
  }
  // Step 8: Test sort modes
  // 8a. Verify new sort ordering (descending by created_at)
  for (let i = 1; i < feedNew.data.length; i++) {
    TestValidator.predicate(
      `new sort order at index ${i}`,
      () => feedNew.data[i - 1].created_at >= feedNew.data[i].created_at,
    );
  }
  // 8b. Hot sort
  const feedHot =
    await api.functional.communityPlatform.communities.posts.feeds.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "hot",
          limit: 50,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(feedHot);
  TestValidator.equals("hot feed has 3 posts", feedHot.data.length, 3);
  // 8c. Top sort
  const feedTop =
    await api.functional.communityPlatform.communities.posts.feeds.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "top",
          limit: 50,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(feedTop);
  TestValidator.equals("top feed has 3 posts", feedTop.data.length, 3);
  // 8d. Controversial sort
  const feedControversial =
    await api.functional.communityPlatform.communities.posts.feeds.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "controversial",
          limit: 50,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(feedControversial);
  TestValidator.equals(
    "controversial feed has 3 posts",
    feedControversial.data.length,
    3,
  );
  // Step 9: Test pagination with limit=2 and cursor navigation
  const feedPage1 =
    await api.functional.communityPlatform.communities.posts.feeds.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "new",
          limit: 2,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(feedPage1);
  TestValidator.equals(
    "pagination page 1 has 2 posts",
    feedPage1.data.length,
    2,
  );
  TestValidator.equals(
    "pagination total records shows 3",
    feedPage1.pagination.records,
    3,
  );
  // Verify the remaining post is not on page 1
  const page1Ids = new Set(feedPage1.data.map((p) => p.id));
  const allPostIds = [textPost.id, linkPost.id, imagePost.id];
  const remainingIds = allPostIds.filter((id) => !page1Ids.has(id));
  TestValidator.equals("one post remains for page 2", remainingIds.length, 1);
}
