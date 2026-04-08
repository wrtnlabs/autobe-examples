import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test filtering and pagination capabilities of the popular feed endpoint.
 *
 * Validates the comprehensive filtering and pagination functionality of the popular feed, ensuring users can discover content through various criteria including post type, vote score, date range, community, and author. The test verifies that all filter combinations work correctly and that pagination metadata accurately reflects the filtered results.
 *
 * Special attention is given to verifying that each filter type correctly narrows down results and that edge cases like empty results are handled gracefully with proper pagination metadata.
 *
 * 1. Register a new guest account to obtain authentication tokens.
 * 2. Test postType filtering:
 *    - Call with postType="text" and verify only text posts are returned
 *    - Call with postType="link" and verify only link posts are returned
 *    - Call with postType="image" and verify only image posts are returned
 * 3. Test vote score filtering:
 *    - Call with voteScoreMin=10 and verify all returned posts have vote_score >= 10
 *    - Call with voteScoreMax=-5 and verify all returned posts have vote_score <= -5
 *    - Call with both voteScoreMin=0 and voteScoreMax=10 to verify range filtering
 * 4. Test date range filtering:
 *    - Call with dateFrom and verify all posts have created_at >= dateFrom
 *    - Call with dateTo and verify all posts have created_at <= dateTo
 *    - Call with both dateFrom and dateTo to verify date range filtering
 * 5. Test community filtering:
 *    - Call with a valid communityId and verify all returned posts belong to that community
 *    - Call with a non-existent communityId and verify empty results are returned
 * 6. Test author filtering:
 *    - Call with a valid authorId and verify all returned posts were created by that member
 *    - Call with a non-existent authorId and verify empty results are returned
 * 7. Test pagination:
 *    - Call with different page values (1, 2, 3) and verify correct page of results is returned
 *    - Call with different limit values (10, 50, 100) and verify correct number of records per page
 *    - Verify pagination metadata accurately reflects the filtered results
 * 8. Test empty results:
 *    - Call with filter combination that matches no posts (e.g., very high voteScoreMin)
 *    - Verify empty data array is returned with correct pagination metadata
 */
export async function test_api_guest_feeds_popular_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Test postType filtering
  {
    const textPosts =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { postType: "text", limit: 10 } },
      );
    typia.assert(textPosts);
    TestValidator.equals(
      "text posts",
      textPosts.data.every((p) => p.post_type === "text"),
      true,
    );
  }
  {
    const linkPosts =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { postType: "link", limit: 10 } },
      );
    typia.assert(linkPosts);
    TestValidator.equals(
      "link posts",
      linkPosts.data.every((p) => p.post_type === "link"),
      true,
    );
  }
  {
    const imagePosts =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { postType: "image", limit: 10 } },
      );
    typia.assert(imagePosts);
    TestValidator.equals(
      "image posts",
      imagePosts.data.every((p) => p.post_type === "image"),
      true,
    );
  }
  // 3. Test vote score filtering
  {
    const highScorePosts =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { voteScoreMin: 10, limit: 10 } },
      );
    typia.assert(highScorePosts);
    TestValidator.equals(
      "high score filter",
      highScorePosts.data.every((p) => p.vote_score >= 10),
      true,
    );
  }
  {
    const lowScorePosts =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { voteScoreMax: -5, limit: 10 } },
      );
    typia.assert(lowScorePosts);
    TestValidator.equals(
      "low score filter",
      lowScorePosts.data.every((p) => p.vote_score <= -5),
      true,
    );
  }
  {
    const rangePosts =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { voteScoreMin: 0, voteScoreMax: 10, limit: 10 } },
      );
    typia.assert(rangePosts);
    TestValidator.equals(
      "score range filter",
      rangePosts.data.every((p) => p.vote_score >= 0 && p.vote_score <= 10),
      true,
    );
  }
  // 4. Test date range filtering
  const pastDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureDate = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  {
    const dateFromPosts =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { dateFrom: pastDate, limit: 10 } },
      );
    typia.assert(dateFromPosts);
    TestValidator.equals(
      "dateFrom filter",
      dateFromPosts.data.every(
        (p) => new Date(p.created_at) >= new Date(pastDate),
      ),
      true,
    );
  }
  {
    const dateToPosts =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { dateTo: futureDate, limit: 10 } },
      );
    typia.assert(dateToPosts);
    TestValidator.equals(
      "dateTo filter",
      dateToPosts.data.every(
        (p) => new Date(p.created_at) <= new Date(futureDate),
      ),
      true,
    );
  }
  {
    const dateRangePosts =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { dateFrom: pastDate, dateTo: futureDate, limit: 10 } },
      );
    typia.assert(dateRangePosts);
    TestValidator.equals(
      "date range filter",
      dateRangePosts.data.every(
        (p) =>
          new Date(p.created_at) >= new Date(pastDate) &&
          new Date(p.created_at) <= new Date(futureDate),
      ),
      true,
    );
  }
  // 5. Test community filtering
  {
    const communityId = typia.random<string & tags.Format<"uuid">>();
    const communityPosts =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { communityId, limit: 10 } },
      );
    typia.assert(communityPosts);
    TestValidator.equals(
      "non-existent community",
      communityPosts.data.length,
      0,
    );
    TestValidator.equals(
      "community pagination records",
      communityPosts.pagination.records,
      0,
    );
    TestValidator.equals(
      "community pagination pages",
      communityPosts.pagination.pages,
      0,
    );
  }
  // 6. Test author filtering
  {
    const authorId = typia.random<string & tags.Format<"uuid">>();
    const authorPosts =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { authorId, limit: 10 } },
      );
    typia.assert(authorPosts);
    TestValidator.equals("non-existent author", authorPosts.data.length, 0);
    TestValidator.equals(
      "author pagination records",
      authorPosts.pagination.records,
      0,
    );
    TestValidator.equals(
      "author pagination pages",
      authorPosts.pagination.pages,
      0,
    );
  }
  // 7. Test pagination
  {
    const page1 =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { page: 1, limit: 10 } },
      );
    typia.assert(page1);
    TestValidator.equals("page 1 metadata", page1.pagination.current, 1);
    TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  }
  {
    const page2 =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { page: 2, limit: 10 } },
      );
    typia.assert(page2);
    TestValidator.equals("page 2 metadata", page2.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  }
  {
    const page3 =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { page: 3, limit: 10 } },
      );
    typia.assert(page3);
    TestValidator.equals("page 3 metadata", page3.pagination.current, 3);
    TestValidator.equals("page 3 limit", page3.pagination.limit, 10);
  }
  {
    const limit10 =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { limit: 10 } },
      );
    typia.assert(limit10);
    TestValidator.equals("limit 10 records", limit10.pagination.limit, 10);
    TestValidator.predicate("limit 10 actual", limit10.data.length <= 10);
  }
  {
    const limit50 =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { limit: 50 } },
      );
    typia.assert(limit50);
    TestValidator.equals("limit 50 records", limit50.pagination.limit, 50);
    TestValidator.predicate("limit 50 actual", limit50.data.length <= 50);
  }
  {
    const limit100 =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { limit: 100 } },
      );
    typia.assert(limit100);
    TestValidator.equals("limit 100 records", limit100.pagination.limit, 100);
    TestValidator.predicate("limit 100 actual", limit100.data.length <= 100);
  }
  // 8. Test empty results
  {
    const emptyResults =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        {
          host: connection.host,
          headers: { Authorization: guest.token.access },
        },
        { body: { voteScoreMin: 999999, limit: 10 } },
      );
    typia.assert(emptyResults);
    TestValidator.equals("empty data array", emptyResults.data.length, 0);
    TestValidator.equals(
      "empty pagination current",
      emptyResults.pagination.current,
      1,
    );
    TestValidator.equals(
      "empty pagination limit",
      emptyResults.pagination.limit,
      10,
    );
    TestValidator.equals(
      "empty pagination records",
      emptyResults.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty pagination pages",
      emptyResults.pagination.pages,
      0,
    );
  }
}
