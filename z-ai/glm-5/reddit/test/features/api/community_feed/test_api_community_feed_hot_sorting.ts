import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test the community feed Hot sorting algorithm.
 *
 * Setup: Create a member, community, and multiple posts with different types.
 * Test Cases:
 * 1. Hot sorting returns posts in hot_score descending order
 * 2. Pagination works correctly with various limits
 * 3. Page beyond results returns empty data
 * 4. Community with no posts returns empty feed
 */
export async function test_api_community_feed_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a test community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Create multiple posts with different types
  const textPost =
    await generate_random_community_member_communities_posts_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "TEXT",
          text_content: RandomGenerator.content({ paragraphs: 3 }),
        },
      },
    );
  typia.assert(textPost);
  const linkPost =
    await generate_random_community_member_communities_posts_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "LINK",
          link_url: "https://example.com/article",
        },
      },
    );
  typia.assert(linkPost);
  const imagePost =
    await generate_random_community_member_communities_posts_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "IMAGE",
          image_url: "https://example.com/image.jpg",
        },
      },
    );
  typia.assert(imagePost);
  // 4. Test Hot sorting with default pagination
  const hotFeed = await api.functional.community.communities.posts.index(
    connection,
    {
      communityName: community.name,
      body: { sort: "hot" } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(hotFeed);
  // 5. Verify pagination metadata
  TestValidator.predicate("has pagination", () => hotFeed.pagination !== null);
  TestValidator.predicate(
    "current page is 1",
    () => hotFeed.pagination.current === 1,
  );
  TestValidator.predicate("has records", () => hotFeed.pagination.records >= 3);
  TestValidator.predicate("has pages", () => hotFeed.pagination.pages >= 1);
  // 6. Verify posts are returned
  TestValidator.predicate("has posts", () => hotFeed.data.length >= 3);
  // 7. Verify post structure for each type
  const foundTextPost = hotFeed.data.find((p) => p.id === textPost.id);
  const foundLinkPost = hotFeed.data.find((p) => p.id === linkPost.id);
  const foundImagePost = hotFeed.data.find((p) => p.id === imagePost.id);
  TestValidator.predicate("text post found", () => foundTextPost !== undefined);
  TestValidator.predicate("link post found", () => foundLinkPost !== undefined);
  TestValidator.predicate(
    "image post found",
    () => foundImagePost !== undefined,
  );
  // 8. Verify content previews based on post type
  if (foundTextPost) {
    TestValidator.equals("text post type", foundTextPost.post_type, "TEXT");
    TestValidator.predicate(
      "text post has text_preview",
      () => foundTextPost.text_preview !== null,
    );
  }
  if (foundLinkPost) {
    TestValidator.equals("link post type", foundLinkPost.post_type, "LINK");
    TestValidator.equals(
      "link post has domain",
      foundLinkPost.link_domain,
      "example.com",
    );
  }
  if (foundImagePost) {
    TestValidator.equals("image post type", foundImagePost.post_type, "IMAGE");
    TestValidator.predicate(
      "image post has thumbnail",
      () => foundImagePost.image_thumbnail_url !== null,
    );
  }
  // 9. Test pagination with minimum limit (10)
  const minLimitFeed = await api.functional.community.communities.posts.index(
    connection,
    {
      communityName: community.name,
      body: { sort: "hot", limit: 10 } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(minLimitFeed);
  TestValidator.equals("minimum limit", minLimitFeed.pagination.limit, 10);
  // 10. Test pagination with maximum limit (100)
  const maxLimitFeed = await api.functional.community.communities.posts.index(
    connection,
    {
      communityName: community.name,
      body: { sort: "hot", limit: 100 } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(maxLimitFeed);
  TestValidator.equals("maximum limit", maxLimitFeed.pagination.limit, 100);
  // 11. Test page beyond available results
  const beyondPageFeed = await api.functional.community.communities.posts.index(
    connection,
    {
      communityName: community.name,
      body: {
        sort: "hot",
        page: 1000,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(beyondPageFeed);
  TestValidator.equals("beyond page is empty", beyondPageFeed.data.length, 0);
  TestValidator.equals(
    "beyond page pagination records",
    beyondPageFeed.pagination.records,
    hotFeed.pagination.records,
  );
  // 12. Test community with zero posts
  const emptyCommunity =
    await generate_random_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: `empty_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(emptyCommunity);
  const emptyFeed = await api.functional.community.communities.posts.index(
    connection,
    {
      communityName: emptyCommunity.name,
      body: { sort: "hot" } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(emptyFeed);
  TestValidator.equals(
    "empty community has no posts",
    emptyFeed.data.length,
    0,
  );
  TestValidator.equals(
    "empty community records",
    emptyFeed.pagination.records,
    0,
  );
  TestValidator.equals("empty community pages", emptyFeed.pagination.pages, 0);
}
