import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_posts_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Generate test user ID
  const userId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
  // Generate test communities
  const communities = ArrayUtil.repeat(3, () => ({
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(2),
  }));
  // Generate test author information
  const author: IRedditPlatformMember.ISummary = {
    id: userId,
    username: RandomGenerator.alphabets(8),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 1 }),
    avatarUrl: null,
    karmaScore: typia.random<number & tags.Type<"int32">>(),
    createdAt: new Date().toISOString(),
    subscriptionCount: typia.random<number & tags.Type<"int32">>(),
  };
  // Filter 1: Test post_type filter (TEXT only)
  const textFilterResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.users.posts.index(connection, {
      userId,
      body: {
        post_type: "TEXT",
        sort_type: "NEW",
      },
    });
  typia.assert(textFilterResponse);
  // Verify all returned posts are TEXT type (if any exist)
  for (const post of textFilterResponse.data) {
    typia.assert(post);
    TestValidator.equals("TEXT post type filter", post.post_type, "TEXT");
  }
  // Filter 2: Test post_type filter (LINK only)
  const linkFilterResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.users.posts.index(connection, {
      userId,
      body: {
        post_type: "LINK",
        sort_type: "NEW",
      },
    });
  typia.assert(linkFilterResponse);
  // Verify all returned posts are LINK type (if any exist)
  for (const post of linkFilterResponse.data) {
    typia.assert(post);
    TestValidator.equals("LINK post type filter", post.post_type, "LINK");
  }
  // Filter 3: Test date range filtering
  const now = new Date();
  const startDate = new Date(now.getTime() - 3 * 86400000); // 3 days ago
  const endDate = new Date(now.getTime() - 1 * 86400000); // 1 day ago
  const dateRangeResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.users.posts.index(connection, {
      userId,
      body: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        sort_type: "NEW",
      },
    });
  typia.assert(dateRangeResponse);
  // Verify all posts are within date range
  for (const post of dateRangeResponse.data) {
    typia.assert(post);
    const postDate = new Date(post.created_at);
    TestValidator.predicate(
      "post created_at within range",
      postDate >= startDate && postDate <= endDate,
    );
  }
  // Filter 4: Test TOP sorting with WEEK time_range
  const topWeekResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.users.posts.index(connection, {
      userId,
      body: {
        sort_type: "TOP",
        time_range: "WEEK",
      },
    });
  typia.assert(topWeekResponse);
  // Verify posts are sorted by vote_score descending
  for (let i = 1; i < topWeekResponse.data.length; i++) {
    typia.assert(topWeekResponse.data[i - 1]);
    typia.assert(topWeekResponse.data[i]);
    TestValidator.predicate(
      "TOP WEEK sorted by vote_score DESC",
      topWeekResponse.data[i - 1].vote_score >=
        topWeekResponse.data[i].vote_score,
    );
  }
  // Filter 5: Test TOP sorting with MONTH time_range
  const topMonthResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.users.posts.index(connection, {
      userId,
      body: {
        sort_type: "TOP",
        time_range: "MONTH",
      },
    });
  typia.assert(topMonthResponse);
  // Verify posts are sorted by vote_score descending
  for (let i = 1; i < topMonthResponse.data.length; i++) {
    typia.assert(topMonthResponse.data[i - 1]);
    typia.assert(topMonthResponse.data[i]);
    TestValidator.predicate(
      "TOP MONTH sorted by vote_score DESC",
      topMonthResponse.data[i - 1].vote_score >=
        topMonthResponse.data[i].vote_score,
    );
  }
  // Filter 6: Test TOP sorting with YEAR time_range
  const topYearResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.users.posts.index(connection, {
      userId,
      body: {
        sort_type: "TOP",
        time_range: "YEAR",
      },
    });
  typia.assert(topYearResponse);
  // Verify posts are sorted by vote_score descending
  for (let i = 1; i < topYearResponse.data.length; i++) {
    typia.assert(topYearResponse.data[i - 1]);
    typia.assert(topYearResponse.data[i]);
    TestValidator.predicate(
      "TOP YEAR sorted by vote_score DESC",
      topYearResponse.data[i - 1].vote_score >=
        topYearResponse.data[i].vote_score,
    );
  }
  // Filter 7: Test TOP sorting with TODAY time_range
  const topTodayResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.users.posts.index(connection, {
      userId,
      body: {
        sort_type: "TOP",
        time_range: "TODAY",
      },
    });
  typia.assert(topTodayResponse);
  // Verify posts are sorted by vote_score descending
  for (let i = 1; i < topTodayResponse.data.length; i++) {
    typia.assert(topTodayResponse.data[i - 1]);
    typia.assert(topTodayResponse.data[i]);
    TestValidator.predicate(
      "TOP TODAY sorted by vote_score DESC",
      topTodayResponse.data[i - 1].vote_score >=
        topTodayResponse.data[i].vote_score,
    );
  }
  // Filter 8: Test TOP sorting with ALL time_range
  const topAllResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.users.posts.index(connection, {
      userId,
      body: {
        sort_type: "TOP",
        time_range: "ALL",
      },
    });
  typia.assert(topAllResponse);
  // Verify posts are sorted by vote_score descending
  for (let i = 1; i < topAllResponse.data.length; i++) {
    typia.assert(topAllResponse.data[i - 1]);
    typia.assert(topAllResponse.data[i]);
    TestValidator.predicate(
      "TOP ALL sorted by vote_score DESC",
      topAllResponse.data[i - 1].vote_score >=
        topAllResponse.data[i].vote_score,
    );
  }
  // Filter 9: Test community_id filter
  const testCommunityId = communities[0].id;
  const communityFilterResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.users.posts.index(connection, {
      userId,
      body: {
        community_id: testCommunityId,
        sort_type: "NEW",
      },
    });
  typia.assert(communityFilterResponse);
  // Verify all returned posts are from the specified community
  for (const post of communityFilterResponse.data) {
    typia.assert(post);
    TestValidator.equals(
      "community_id filter",
      post.community.id,
      testCommunityId,
    );
  }
  // Filter 10: Test combined filtering (post_type + community_id)
  const combinedFilterResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.users.posts.index(connection, {
      userId,
      body: {
        post_type: "IMAGE",
        community_id: testCommunityId,
        sort_type: "NEW",
      },
    });
  typia.assert(combinedFilterResponse);
  // Verify all posts match both filters
  for (const post of combinedFilterResponse.data) {
    typia.assert(post);
    TestValidator.equals("combined filter post_type", post.post_type, "IMAGE");
    TestValidator.equals(
      "combined filter community_id",
      post.community.id,
      testCommunityId,
    );
  }
  // Filter 11: Test combined sorting + filtering (TOP + WEEK + community)
  const combinedSortFilterResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.users.posts.index(connection, {
      userId,
      body: {
        community_id: testCommunityId,
        sort_type: "TOP",
        time_range: "WEEK",
      },
    });
  typia.assert(combinedSortFilterResponse);
  // Verify all posts are from the community
  for (const post of combinedSortFilterResponse.data) {
    typia.assert(post);
    TestValidator.equals(
      "combined sort filter community",
      post.community.id,
      testCommunityId,
    );
  }
  // Verify sorted by vote_score descending
  for (let i = 1; i < combinedSortFilterResponse.data.length; i++) {
    typia.assert(combinedSortFilterResponse.data[i - 1]);
    typia.assert(combinedSortFilterResponse.data[i]);
    TestValidator.predicate(
      "combined sort filter sorted by vote_score DESC",
      combinedSortFilterResponse.data[i - 1].vote_score >=
        combinedSortFilterResponse.data[i].vote_score,
    );
  }
  // Validate author information in response
  if (textFilterResponse.data.length > 0) {
    typia.assert(textFilterResponse.data[0]);
    typia.assert(textFilterResponse.data[0].author);
    TestValidator.equals(
      "author username present",
      textFilterResponse.data[0].author.username,
      textFilterResponse.data[0].author.username,
    );
    TestValidator.equals(
      "author display_name present",
      textFilterResponse.data[0].author.displayName,
      textFilterResponse.data[0].author.displayName,
    );
  }
  // Validate community information in response
  if (textFilterResponse.data.length > 0) {
    typia.assert(textFilterResponse.data[0]);
    typia.assert(textFilterResponse.data[0].community);
    TestValidator.equals(
      "community name present",
      textFilterResponse.data[0].community.name,
      textFilterResponse.data[0].community.name,
    );
    TestValidator.equals(
      "community subscriber_count present",
      textFilterResponse.data[0].community.subscriber_count,
      textFilterResponse.data[0].community.subscriber_count,
    );
  }
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current",
    textFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    textFilterResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records matches data length",
    textFilterResponse.pagination.records,
    textFilterResponse.data.length,
  );
  TestValidator.equals(
    "pagination pages calculation",
    textFilterResponse.pagination.pages,
    Math.ceil(textFilterResponse.data.length / 20),
  );
}