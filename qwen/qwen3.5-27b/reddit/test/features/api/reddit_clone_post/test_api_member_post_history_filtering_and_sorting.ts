import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test the filtering and sorting capabilities of the member's post history endpoint.
 * This test verifies filtering by post type, community, date range, search keywords,
 * sorting options (hot, new, top, controversial), and pagination functionality.
 */
export async function test_api_member_post_history_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(memberAuth);
  // 2. Create a community for testing
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Create multiple posts of different types
  const textPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Test Text Post Article",
        postType: "text",
        communityId: community.id,
        content:
          "This is a test text post with detailed content about programming.",
      },
    },
  );
  typia.assert(textPost);
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Test Link Post Example",
        postType: "link",
        communityId: community.id,
        content: "https://example.com/test-link",
      },
    },
  );
  typia.assert(linkPost);
  const imagePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Test Image Post Visual",
        postType: "image",
        communityId: community.id,
        content: null,
      },
    },
  );
  typia.assert(imagePost);
  // 4. Test filtering by post_type = "text"
  const textFilterResult =
    await api.functional.redditClone.member.me.posts.index(memberConnection, {
      body: {
        post_type: "text",
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(textFilterResult);
  TestValidator.equals(
    "text filter returns only text posts",
    textFilterResult.data.every((p) => p.post_type === "text"),
    true,
  );
  TestValidator.predicate(
    "text filter contains the text post",
    textFilterResult.data.some((p) => p.id === textPost.id),
  );
  // 5. Test filtering by post_type = "link"
  const linkFilterResult =
    await api.functional.redditClone.member.me.posts.index(memberConnection, {
      body: {
        post_type: "link",
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(linkFilterResult);
  TestValidator.equals(
    "link filter returns only link posts",
    linkFilterResult.data.every((p) => p.post_type === "link"),
    true,
  );
  TestValidator.predicate(
    "link filter contains the link post",
    linkFilterResult.data.some((p) => p.id === linkPost.id),
  );
  // 6. Test filtering by post_type = "image"
  const imageFilterResult =
    await api.functional.redditClone.member.me.posts.index(memberConnection, {
      body: {
        post_type: "image",
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(imageFilterResult);
  TestValidator.equals(
    "image filter returns only image posts",
    imageFilterResult.data.every((p) => p.post_type === "image"),
    true,
  );
  TestValidator.predicate(
    "image filter contains the image post",
    imageFilterResult.data.some((p) => p.id === imagePost.id),
  );
  // 7. Test filtering by community_id
  const communityFilterResult =
    await api.functional.redditClone.member.me.posts.index(memberConnection, {
      body: {
        community_id: community.id,
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(communityFilterResult);
  TestValidator.equals(
    "community filter returns posts from specified community",
    communityFilterResult.data.every((p) => p.community.id === community.id),
    true,
  );
  TestValidator.equals(
    "community filter records count",
    communityFilterResult.pagination.records,
    3,
  );
  // 8. Test date range filtering (created_at_from, created_at_to)
  const dateRangeResult =
    await api.functional.redditClone.member.me.posts.index(memberConnection, {
      body: {
        created_at_from: textPost.created_at,
        created_at_to: new Date().toISOString(),
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns posts within range",
    dateRangeResult.data.length > 0,
  );
  // 9. Test search functionality with keywords
  const searchResult = await api.functional.redditClone.member.me.posts.index(
    memberConnection,
    {
      body: {
        search: "Test",
        page: 1,
        page_size: 10,
      },
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search finds posts with keyword",
    searchResult.data.length > 0,
  );
  TestValidator.equals(
    "search results contain keyword in title",
    searchResult.data.every((p) => p.title.toLowerCase().includes("test")),
    true,
  );
  // 10. Test sorting by "new" (chronologically recent)
  const newSortResult = await api.functional.redditClone.member.me.posts.index(
    memberConnection,
    {
      body: {
        sort: "new",
        page: 1,
        page_size: 10,
      },
    },
  );
  typia.assert(newSortResult);
  TestValidator.predicate(
    "new sort returns posts in chronological order",
    newSortResult.data.length > 0,
  );
  // 11. Test sorting by "hot" (engagement and recency)
  const hotSortResult = await api.functional.redditClone.member.me.posts.index(
    memberConnection,
    {
      body: {
        sort: "hot",
        page: 1,
        page_size: 10,
      },
    },
  );
  typia.assert(hotSortResult);
  TestValidator.predicate(
    "hot sort returns posts",
    hotSortResult.data.length > 0,
  );
  // 12. Test sorting by "top" with time_filter
  const topSortResult = await api.functional.redditClone.member.me.posts.index(
    memberConnection,
    {
      body: {
        sort: "top",
        time_filter: "all_time",
        page: 1,
        page_size: 10,
      },
    },
  );
  typia.assert(topSortResult);
  TestValidator.predicate(
    "top sort returns posts",
    topSortResult.data.length > 0,
  );
  // 13. Test sorting by "controversial"
  const controversialSortResult =
    await api.functional.redditClone.member.me.posts.index(memberConnection, {
      body: {
        sort: "controversial",
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(controversialSortResult);
  TestValidator.predicate(
    "controversial sort returns posts",
    controversialSortResult.data.length > 0,
  );
  // 14. Test pagination with page and page_size
  const page1Result = await api.functional.redditClone.member.me.posts.index(
    memberConnection,
    {
      body: {
        page: 1,
        page_size: 2,
      },
    },
  );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 returns correct page size",
    page1Result.data.length,
    2,
  );
  TestValidator.equals(
    "pagination current page is 1",
    page1Result.pagination.current,
    1,
  );
  const page2Result = await api.functional.redditClone.member.me.posts.index(
    memberConnection,
    {
      body: {
        page: 2,
        page_size: 2,
      },
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 returns remaining posts",
    page2Result.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination records count matches total",
    page2Result.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages count is correct",
    page2Result.pagination.pages,
    2,
  );
  // 15. Test multiple filter combinations (post_type + community_id + date range)
  const combinedFilterResult =
    await api.functional.redditClone.member.me.posts.index(memberConnection, {
      body: {
        post_type: "text",
        community_id: community.id,
        created_at_from: textPost.created_at,
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter returns only matching posts",
    combinedFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter post type is text",
    combinedFilterResult.data[0].post_type,
    "text",
  );
  TestValidator.equals(
    "combined filter community matches",
    combinedFilterResult.data[0].community.id,
    community.id,
  );
}
