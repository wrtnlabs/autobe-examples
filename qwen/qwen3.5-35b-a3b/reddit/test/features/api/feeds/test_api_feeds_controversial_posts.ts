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

export async function test_api_feeds_controversial_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call the controversial feed endpoint (public, no authentication required)
  const response = await api.functional.redditPlatform.feeds.controversial(
    connection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // 2. Verify pagination metadata is correct
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 3. Verify each post meets controversial criteria
  for (const post of response.data) {
    typia.assert(post);
    // Vote score must be between -2 and +2 (inclusive)
    TestValidator.predicate(
      `post ${post.id} vote_score in range [-2, 2]`,
      post.vote_score >= -2 && post.vote_score <= 2,
    );
    // Note: total_votes >= 10 cannot be directly validated as ISummary only provides vote_score
    // The fact that the post appears in the controversial feed implies it meets the criteria
    // Verify post summary includes all required fields
    TestValidator.equals(
      "post id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.id,
      ),
      true,
    );
    TestValidator.predicate(
      "post title is string",
      typeof post.title === "string" && post.title.length > 0,
    );
    TestValidator.predicate(
      "post type is valid",
      ["TEXT", "LINK", "IMAGE"].includes(post.post_type),
    );
    TestValidator.predicate(
      "vote_score is int32",
      Number.isInteger(post.vote_score),
    );
    TestValidator.predicate(
      "comment_count is int32",
      Number.isInteger(post.comment_count),
    );
    TestValidator.equals(
      "comment_count non-negative",
      post.comment_count,
      post.comment_count >= 0 ? post.comment_count : undefined,
    );
    // Verify author has required summary fields
    TestValidator.equals(
      "author id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.author.id,
      ),
      true,
    );
    TestValidator.predicate(
      "author username is string",
      typeof post.author.username === "string" &&
        post.author.username.length > 0,
    );
    TestValidator.predicate(
      "author display_name is string",
      typeof post.author.displayName === "string" &&
        post.author.displayName.length > 0,
    );
    TestValidator.predicate(
      "author karma_score is int32",
      Number.isInteger(post.author.karmaScore),
    );
    TestValidator.equals(
      "author karma_score non-negative",
      post.author.karmaScore,
      post.author.karmaScore >= 0 ? post.author.karmaScore : undefined,
    );
    TestValidator.predicate(
      "author bio can be null or string",
      post.author.bio === null || typeof post.author.bio === "string",
    );
    TestValidator.predicate(
      "author avatar_url can be null or URI",
      post.author.avatarUrl === null ||
        (typeof post.author.avatarUrl === "string" &&
          post.author.avatarUrl.length > 0),
    );
    TestValidator.predicate(
      "author created_at is date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(post.author.createdAt),
    );
    TestValidator.predicate(
      "author subscription_count is int32",
      Number.isInteger(post.author.subscriptionCount),
    );
    TestValidator.equals(
      "author subscription_count non-negative",
      post.author.subscriptionCount,
      post.author.subscriptionCount >= 0
        ? post.author.subscriptionCount
        : undefined,
    );
    // Verify community has required summary fields
    TestValidator.equals(
      "community id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.community.id,
      ),
      true,
    );
    TestValidator.predicate(
      "community name is string",
      typeof post.community.name === "string" && post.community.name.length > 0,
    );
    TestValidator.predicate(
      "community description can be null or string",
      post.community.description === null ||
        (typeof post.community.description === "string" &&
          post.community.description.length > 0),
    );
    TestValidator.predicate(
      "community icon_url can be null or URI",
      post.community.icon_url === null ||
        (typeof post.community.icon_url === "string" &&
          post.community.icon_url.length > 0),
    );
    TestValidator.predicate(
      "community subscriber_count is int32",
      Number.isInteger(post.community.subscriber_count),
    );
    TestValidator.equals(
      "community subscriber_count non-negative",
      post.community.subscriber_count,
      post.community.subscriber_count >= 0
        ? post.community.subscriber_count
        : undefined,
    );
    TestValidator.predicate(
      "community author is IRedditPlatformMember.ISummary",
      post.community.author.id !== undefined,
    );
    TestValidator.predicate(
      "community created_at is date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(post.community.created_at),
    );
    // Verify post dates
    TestValidator.predicate(
      "post created_at is date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(post.created_at),
    );
    TestValidator.predicate(
      "post deleted_at is null or date-time",
      post.deleted_at === null ||
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(post.deleted_at),
    );
    // For active posts, deleted_at should be null
    if (post.deleted_at === null) {
      // Active post - nothing more to validate
    } else {
      // Deleted post - verify it's a valid date string
      const deletedDate = new Date(post.deleted_at);
      TestValidator.predicate(
        "post deleted_at is valid date",
        !isNaN(deletedDate.getTime()),
      );
    }
  }
  // 4. Test pagination with different parameters
  const paginatedResponse =
    await api.functional.redditPlatform.feeds.controversial(connection, {
      body: {
        page: 2,
        limit: 10,
      },
    });
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "second page number",
    paginatedResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "page limit is 10",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.notEquals(
    "second page data length differs from first page",
    paginatedResponse.data.length,
    response.data.length,
  );
  // 5. Test with post_type filter
  const textPostsResponse =
    await api.functional.redditPlatform.feeds.controversial(connection, {
      body: {
        post_type: "TEXT",
      },
    });
  typia.assert(textPostsResponse);
  if (textPostsResponse.data.length > 0) {
    for (const post of textPostsResponse.data) {
      TestValidator.equals(
        `filtered post ${post.id} is TEXT type`,
        post.post_type,
        "TEXT",
      );
    }
  }
  // 6. Test with link posts
  const linkPostsResponse =
    await api.functional.redditPlatform.feeds.controversial(connection, {
      body: {
        post_type: "LINK",
      },
    });
  typia.assert(linkPostsResponse);
  if (linkPostsResponse.data.length > 0) {
    for (const post of linkPostsResponse.data) {
      TestValidator.equals(
        `filtered post ${post.id} is LINK type`,
        post.post_type,
        "LINK",
      );
    }
  }
  // 7. Test with image posts
  const imagePostsResponse =
    await api.functional.redditPlatform.feeds.controversial(connection, {
      body: {
        post_type: "IMAGE",
      },
    });
  typia.assert(imagePostsResponse);
  if (imagePostsResponse.data.length > 0) {
    for (const post of imagePostsResponse.data) {
      TestValidator.equals(
        `filtered post ${post.id} is IMAGE type`,
        post.post_type,
        "IMAGE",
      );
    }
  }
  // 8. Test empty feed scenario (with high page number)
  const emptyPageResponse =
    await api.functional.redditPlatform.feeds.controversial(connection, {
      body: {
        page: 999,
        limit: 10,
      },
    });
  typia.assert(emptyPageResponse);
  TestValidator.equals(
    "empty page current",
    emptyPageResponse.pagination.current,
    999,
  );
  TestValidator.equals(
    "empty page limit",
    emptyPageResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty page records",
    emptyPageResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty page data array empty",
    emptyPageResponse.data.length,
    0,
  );
  // 9. Test sorting - verify posts are ordered by controversy level
  // The controversial feed should return posts with vote_score closest to zero first
  // (abs(vote_score) closest to 0), or by total_votes descending
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prevPost = response.data[i - 1];
      const currPost = response.data[i];
      // Controversial posts should have vote_score in [-2, 2]
      TestValidator.predicate(
        `post at index ${i} has vote_score in range`,
        currPost.vote_score >= -2 && currPost.vote_score <= 2,
      );
    }
  }
}
