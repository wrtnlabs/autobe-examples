import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_community_feed_guest_access(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a member and community for testing
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // Create posts with different content types
  const textPost = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: "Text Post Title",
        contentType: "text",
        textContent: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(textPost);
  const linkPost = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: "Link Post Title",
        contentType: "link",
        textContent: null,
        linkUrl: "https://example.com/article",
        imageUrl: null,
      },
    },
  );
  typia.assert(linkPost);
  const imagePost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          title: "Image Post Title",
          contentType: "image",
          textContent: null,
          linkUrl: null,
          imageUrl: "https://example.com/image.png",
        },
      },
    );
  typia.assert(imagePost);
  // Test: Guest access to community feed (no authentication)
  const guestConnection: api.IConnection = { host: connection.host };
  const feedResponse =
    await api.functional.communityPlatform.communities.feed.index(
      guestConnection,
      {
        communityName: community.name,
        body: {
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(feedResponse);
  // Verify pagination values (business logic, not types)
  TestValidator.equals("current page", feedResponse.pagination.current, 1);
  TestValidator.predicate("limit is valid", feedResponse.pagination.limit > 0);
  TestValidator.predicate(
    "records count includes created posts",
    feedResponse.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pages count is valid",
    feedResponse.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "data contains created posts",
    feedResponse.data.length >= 3,
  );
  // Verify all posts belong to the correct community (business logic)
  const allPostsInCorrectCommunity = feedResponse.data.every(
    (post) => post.community.id === community.id,
  );
  TestValidator.predicate(
    "all posts in correct community",
    allPostsInCorrectCommunity,
  );
  // Verify content-type-specific fields are populated (business logic)
  const textPostInFeed = feedResponse.data.find((p) => p.id === textPost.id);
  const linkPostInFeed = feedResponse.data.find((p) => p.id === linkPost.id);
  const imagePostInFeed = feedResponse.data.find((p) => p.id === imagePost.id);
  if (textPostInFeed !== undefined) {
    TestValidator.predicate(
      "text post has textPreview",
      textPostInFeed.textPreview !== null &&
        textPostInFeed.textPreview !== undefined,
    );
  }
  if (linkPostInFeed !== undefined) {
    TestValidator.predicate(
      "link post has linkDomain",
      linkPostInFeed.linkDomain !== null &&
        linkPostInFeed.linkDomain !== undefined,
    );
  }
  if (imagePostInFeed !== undefined) {
    TestValidator.predicate(
      "image post has thumbnailUrl",
      imagePostInFeed.thumbnailUrl !== null &&
        imagePostInFeed.thumbnailUrl !== undefined,
    );
  }
  // Verify posts are visible to guest (soft-deleted posts excluded)
  TestValidator.predicate(
    "posts visible to guest",
    feedResponse.data.length > 0,
  );
}
