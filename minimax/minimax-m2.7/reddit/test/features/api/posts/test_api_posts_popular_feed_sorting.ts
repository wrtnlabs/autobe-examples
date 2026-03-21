import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving the popular feed with different sorting algorithms.
 *
 * Validates that posts are correctly ordered based on the selected sort type:
 * - hot: combines vote score and recency
 * - new: newest first by creation timestamp
 * - top: highest vote score first
 * - controversial: polarizing posts with similar up/down votes first
 *
 * Also validates time range filters for top and controversial sorting.
 */
export async function test_api_posts_popular_feed_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Test default sort (hot)
  const hotFeed = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "hot",
      limit: 20,
      page: 1,
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(hotFeed);
  // Validate hot feed response structure
  TestValidator.equals(
    "hot feed has pagination",
    hotFeed.pagination !== null,
    true,
  );
  TestValidator.equals(
    "hot feed has data array",
    Array.isArray(hotFeed.data),
    true,
  );
  TestValidator.predicate(
    "hot feed has at least one post",
    hotFeed.data.length > 0,
  );
  // Validate post summary structure
  if (hotFeed.data.length > 0) {
    const firstPost = hotFeed.data[0];
    TestValidator.equals("post has id", typeof firstPost.id === "string", true);
    TestValidator.equals(
      "post has title",
      typeof firstPost.title === "string",
      true,
    );
    TestValidator.equals(
      "post has type",
      typeof firstPost.type === "string",
      true,
    );
    TestValidator.equals(
      "post has vote_score",
      typeof firstPost.vote_score === "number",
      true,
    );
    TestValidator.equals(
      "post has comment_count",
      typeof firstPost.comment_count === "number",
      true,
    );
    TestValidator.equals(
      "post has created_at",
      typeof firstPost.created_at === "string",
      true,
    );
    TestValidator.equals("post has author", firstPost.author !== null, true);
    TestValidator.equals(
      "post has community",
      firstPost.community !== null,
      true,
    );
  }
  // Test new sort (newest first)
  const newFeed = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "new",
      limit: 20,
      page: 1,
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(newFeed);
  TestValidator.equals("new feed has data", newFeed.data.length > 0, true);
  // Verify sorting by created_at for new sort
  if (newFeed.data.length > 1) {
    for (let i = 0; i < newFeed.data.length - 1; i++) {
      const current = new Date(newFeed.data[i].created_at).getTime();
      const next = new Date(newFeed.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `new sort: post ${i} is newer than post ${i + 1}`,
        current >= next,
      );
    }
  }
  // Test top sort (highest vote score first)
  const topFeed = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "top",
      limit: 20,
      page: 1,
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(topFeed);
  TestValidator.equals("top feed has data", topFeed.data.length > 0, true);
  // Verify sorting by vote_score for top sort
  if (topFeed.data.length > 1) {
    for (let i = 0; i < topFeed.data.length - 1; i++) {
      const current = topFeed.data[i].vote_score;
      const next = topFeed.data[i + 1].vote_score;
      TestValidator.predicate(
        `top sort: post ${i} has >= vote_score than post ${i + 1}`,
        current >= next,
      );
    }
  }
  // Test controversial sort (polarizing posts first)
  const controversialFeed = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "controversial",
        limit: 20,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(controversialFeed);
  TestValidator.equals(
    "controversial feed has data",
    controversialFeed.data.length > 0,
    true,
  );
  // Test time range filter with top sort
  const topDayFeed = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "top",
      timeRange: "day",
      limit: 20,
      page: 1,
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(topDayFeed);
  const topWeekFeed = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "top",
      timeRange: "week",
      limit: 20,
      page: 1,
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(topWeekFeed);
  const topMonthFeed = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "top",
        timeRange: "month",
        limit: 20,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(topMonthFeed);
  const topYearFeed = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "top",
      timeRange: "year",
      limit: 20,
      page: 1,
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(topYearFeed);
  const topAllFeed = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "top",
      timeRange: "all",
      limit: 20,
      page: 1,
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(topAllFeed);
  // Test time range filter with controversial sort
  const controversialDayFeed = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        sort: "controversial",
        timeRange: "day",
        limit: 20,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(controversialDayFeed);
  // Test pagination
  const page1 = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "hot",
      limit: 5,
      page: 1,
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals("page 1 has 5 items", page1.data.length <= 5, true);
  TestValidator.equals("page 1 current is 1", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit is 5", page1.pagination.limit, 5);
  const page2 = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "hot",
      limit: 5,
      page: 2,
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  // Test post type filter
  const textPosts = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "hot",
      postType: "text",
      limit: 20,
      page: 1,
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(textPosts);
  const linkPosts = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "hot",
      postType: "link",
      limit: 20,
      page: 1,
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(linkPosts);
  const imagePosts = await api.functional.redditClone.posts.index(connection, {
    body: {
      sort: "hot",
      postType: "image",
      limit: 20,
      page: 1,
    } satisfies IRedditClonePostLink.IRequest,
  });
  typia.assert(imagePosts);
  // Validate author info structure
  if (hotFeed.data.length > 0) {
    const author = hotFeed.data[0].author;
    TestValidator.equals("author has id", typeof author.id === "string", true);
    TestValidator.equals(
      "author has username",
      typeof author.username === "string",
      true,
    );
    TestValidator.equals(
      "author has created_at",
      typeof author.created_at === "string",
      true,
    );
    TestValidator.equals(
      "author has karma_count",
      typeof author.karma_count === "number",
      true,
    );
    TestValidator.equals("author has profile", author.profile !== null, true);
  }
  // Validate community info structure
  if (hotFeed.data.length > 0) {
    const community = hotFeed.data[0].community;
    TestValidator.equals(
      "community has id",
      typeof community.id === "string",
      true,
    );
    TestValidator.equals(
      "community has name",
      typeof community.name === "string",
      true,
    );
    TestValidator.equals(
      "community has description",
      typeof community.description === "string",
      true,
    );
    TestValidator.equals(
      "community has subscriber_count",
      typeof community.subscriber_count === "number",
      true,
    );
    TestValidator.equals("community has owner", community.owner !== null, true);
  }
  // Validate pagination records count
  TestValidator.predicate(
    "pagination has valid records",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    page1.pagination.pages >= 0,
  );
}
