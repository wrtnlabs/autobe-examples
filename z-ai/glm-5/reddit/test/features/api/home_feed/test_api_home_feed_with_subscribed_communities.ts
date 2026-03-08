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

export async function test_api_home_feed_with_subscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a new community (automatically subscribes the creator)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Create a post in the subscribed community (text post)
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.content({ paragraphs: 2 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 4. Call the home feed endpoint
  const homeFeed =
    await api.functional.communityPlatform.member.home.feed(memberConnection);
  typia.assert(homeFeed);
  // 5. Verify pagination structure
  TestValidator.predicate(
    "pagination has required fields",
    () =>
      homeFeed.pagination.current >= 0 &&
      homeFeed.pagination.limit >= 0 &&
      homeFeed.pagination.records >= 0 &&
      homeFeed.pagination.pages >= 0,
  );
  // 6. Verify at least one post exists in the feed
  TestValidator.predicate(
    "feed contains posts",
    () => homeFeed.data.length > 0,
  );
  // 7. Verify the created post appears in the feed
  const foundPost = homeFeed.data.find((p) => p.id === post.id);
  TestValidator.predicate(
    "created post appears in feed",
    () => foundPost !== undefined,
  );
  // 8. Verify the post belongs to the subscribed community
  if (foundPost) {
    TestValidator.equals(
      "post community matches",
      foundPost.community.id,
      community.id,
    );
    TestValidator.equals(
      "post community name matches",
      foundPost.community.name,
      community.name,
    );
  }
  // 9. Verify all posts in feed belong to subscribed communities
  for (const feedPost of homeFeed.data) {
    TestValidator.equals(
      "post belongs to subscribed community",
      feedPost.community.id,
      community.id,
    );
  }
  // 10. Verify post summary has required fields
  if (foundPost) {
    TestValidator.predicate(
      "post has title",
      () => typeof foundPost.title === "string" && foundPost.title.length > 0,
    );
    TestValidator.predicate(
      "post has contentType",
      () =>
        foundPost.contentType === "text" ||
        foundPost.contentType === "link" ||
        foundPost.contentType === "image",
    );
    TestValidator.predicate(
      "post has score",
      () => typeof foundPost.score === "number",
    );
    TestValidator.predicate(
      "post has commentCount",
      () => typeof foundPost.commentCount === "number",
    );
    TestValidator.predicate(
      "post has author",
      () => foundPost.author !== null && foundPost.author !== undefined,
    );
    TestValidator.predicate(
      "post has community",
      () => foundPost.community !== null && foundPost.community !== undefined,
    );
    TestValidator.predicate(
      "post has createdAt",
      () => typeof foundPost.createdAt === "string",
    );
    // 11. Verify text post has textPreview
    if (foundPost.contentType === "text") {
      TestValidator.predicate(
        "text post has textPreview",
        () =>
          foundPost.textPreview !== undefined && foundPost.textPreview !== null,
      );
    }
  }
}
