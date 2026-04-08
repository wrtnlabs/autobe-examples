import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

/**
 * Test cursor-based pagination for community feed.
 *
 * Validates the complete pagination flow for community feed retrieval including first page request, subsequent page requests, pagination metadata accuracy, edge case handling for out-of-range requests, and consistent ordering across pages.
 *
 * The test creates a member account, establishes a community, and generates 25 posts to exceed the default page size. This ensures pagination behavior can be validated across multiple pages with sufficient data.
 *
 * 1. Member registers and authenticates via authorize_member_join utility.
 * 2. Member creates a community using generate_random_reddit_community_member_communities_create.
 * 3. Member creates 25 text posts in the community using generate_random_reddit_community_posts_create.
 * 4. First page request (page 1, limit 10) validates pagination metadata and returns 10 posts.
 * 5. Second page request (page 2) validates correct next page data.
 * 6. Third page request validates remaining posts and pagination boundaries.
 * 7. Fourth page request (beyond available data) validates empty data array with valid pagination structure.
 * 8. Validates consistent ordering by checking created_at timestamps are in descending order across all pages.
 */
export async function test_api_community_feed_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create 25 posts to test pagination (more than page size)
  const posts = await ArrayUtil.asyncRepeat(25, async () => {
    const post = await generate_random_reddit_community_posts_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });
  // 4. First page request (page 1, limit 10)
  const firstPage = await api.functional.redditCommunity.feeds.community.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        sort: "new",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate first page metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.equals("first page records", firstPage.pagination.records, 25);
  TestValidator.equals("first page pages", firstPage.pagination.pages, 3);
  TestValidator.equals("first page data length", firstPage.data.length, 10);
  // 5. Second page request (page 2)
  const secondPage = await api.functional.redditCommunity.feeds.community.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        page: 2,
        limit: 10,
        sort: "new",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(secondPage);
  // Validate second page metadata
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  TestValidator.equals(
    "second page records",
    secondPage.pagination.records,
    25,
  );
  TestValidator.equals("second page pages", secondPage.pagination.pages, 3);
  TestValidator.equals("second page data length", secondPage.data.length, 10);
  // 6. Third page request (page 3, last page with 5 posts)
  const thirdPage = await api.functional.redditCommunity.feeds.community.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        page: 3,
        limit: 10,
        sort: "new",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(thirdPage);
  // Validate third page metadata (last page with 5 remaining posts)
  TestValidator.equals("third page current", thirdPage.pagination.current, 3);
  TestValidator.equals("third page limit", thirdPage.pagination.limit, 10);
  TestValidator.equals("third page records", thirdPage.pagination.records, 25);
  TestValidator.equals("third page pages", thirdPage.pagination.pages, 3);
  TestValidator.equals("third page data length", thirdPage.data.length, 5);
  // 7. Fourth page request (beyond available data)
  const fourthPage = await api.functional.redditCommunity.feeds.community.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        page: 4,
        limit: 10,
        sort: "new",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(fourthPage);
  // Validate fourth page returns empty data with valid structure
  TestValidator.equals("fourth page data length", fourthPage.data.length, 0);
  TestValidator.predicate(
    "fourth page has valid pagination",
    fourthPage.pagination !== undefined,
  );
  // 8. Validate consistent ordering across pages (created_at descending)
  const allPosts = [...firstPage.data, ...secondPage.data, ...thirdPage.data];
  TestValidator.predicate("posts ordered by created_at descending", () => {
    for (let i = 1; i < allPosts.length; i++) {
      const prev = new Date(allPosts[i - 1].created_at).getTime();
      const curr = new Date(allPosts[i].created_at).getTime();
      if (prev < curr) return false;
    }
    return true;
  });
  // Validate no duplicate posts across pages
  const postIds = allPosts.map((p) => p.id);
  const uniquePostIds = new Set(postIds);
  TestValidator.equals(
    "no duplicate posts",
    postIds.length,
    uniquePostIds.size,
  );
}
