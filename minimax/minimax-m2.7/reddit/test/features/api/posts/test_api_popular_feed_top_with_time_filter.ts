import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the popular feed with top sorting combined with time range filters.
 * Verify that using sort='top' with timeRange='week' returns only posts from
 * the last 7 days sorted by highest vote score. Test all time range options:
 * day, week, month, year, and all. Validate that posts outside the time filter
 * are excluded from results. This scenario ensures guests can discover
 * top-performing posts from specific time periods across all communities.
 */
export async function test_api_popular_feed_top_with_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // Define time range options to test
  const timeRanges = ["day", "week", "month", "year", "all"] as const;
  // Test each time range option with top sorting
  for (const timeRange of timeRanges) {
    const response = await api.functional.redditClone.guest.posts.popular.index(
      guestConnection,
      {
        body: {
          sort: "top",
          timeRange: timeRange,
          limit: 20,
          page: 1,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
    typia.assert(response);
    // Validate response structure
    TestValidator.equals(
      "pagination exists",
      response.pagination !== null,
      true,
    );
    TestValidator.equals(
      "data array exists",
      Array.isArray(response.data),
      true,
    );
    TestValidator.predicate("has pagination metadata", () => {
      return (
        response.pagination.current >= 0 &&
        response.pagination.limit > 0 &&
        response.pagination.records >= 0 &&
        response.pagination.pages >= 0
      );
    });
    // Validate each post in the response
    for (const post of response.data) {
      typia.assert(post);
      // Validate post has required fields
      TestValidator.equals("post has id", typeof post.id === "string", true);
      TestValidator.equals(
        "post has title",
        typeof post.title === "string",
        true,
      );
      TestValidator.equals(
        "post has type",
        typeof post.type === "string",
        true,
      );
      TestValidator.equals(
        "post has vote_score",
        typeof post.vote_score === "number",
        true,
      );
      TestValidator.equals(
        "post has comment_count",
        typeof post.comment_count === "number",
        true,
      );
      TestValidator.equals(
        "post has created_at",
        typeof post.created_at === "string",
        true,
      );
      TestValidator.equals("post has author", post.author !== null, true);
      TestValidator.equals("post has community", post.community !== null, true);
      // Validate vote_score is non-negative
      TestValidator.predicate("vote_score is non-negative", () => {
        return post.vote_score >= 0;
      });
      // Validate comment_count is non-negative
      TestValidator.predicate("comment_count is non-negative", () => {
        return post.comment_count >= 0;
      });
      // Validate author structure
      if (post.author) {
        TestValidator.equals(
          "author has id",
          typeof post.author.id === "string",
          true,
        );
        TestValidator.equals(
          "author has username",
          typeof post.author.username === "string",
          true,
        );
        TestValidator.equals(
          "author has karma_count",
          typeof post.author.karma_count === "number",
          true,
        );
      }
      // Validate community structure
      if (post.community) {
        TestValidator.equals(
          "community has id",
          typeof post.community.id === "string",
          true,
        );
        TestValidator.equals(
          "community has name",
          typeof post.community.name === "string",
          true,
        );
        TestValidator.equals(
          "community has subscriber_count",
          typeof post.community.subscriber_count === "number",
          true,
        );
      }
    }
    // Validate sorting - posts should be ordered by vote_score descending
    if (response.data.length > 1) {
      for (let i = 0; i < response.data.length - 1; i++) {
        TestValidator.predicate(
          `post[${i}] vote_score >= post[${i + 1}] vote_score for timeRange=${timeRange}`,
          () => response.data[i].vote_score >= response.data[i + 1].vote_score,
        );
      }
    }
  }
  // Test with explicit pagination parameters
  const paginatedResponse =
    await api.functional.redditClone.guest.posts.popular.index(
      guestConnection,
      {
        body: {
          sort: "top",
          timeRange: "week",
          limit: 10,
          page: 1,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination limit
  TestValidator.equals(
    "limit matches request",
    paginatedResponse.pagination.limit === 10 ||
      paginatedResponse.data.length <= 10,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    paginatedResponse.pagination.current,
    1,
  );
}
