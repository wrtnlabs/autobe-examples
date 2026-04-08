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

export async function test_api_guest_feeds_popular_alternative_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guest: IRedditCommunityGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IRedditCommunityGuest.IJoin,
    },
  );
  typia.assert(guest);
  // 2. Create guest connection with auth token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${guest.token.access}` },
  };
  // 3. Test sort="new" - chronological ordering
  const newSortResponse =
    await api.functional.redditCommunity.guest.feeds.popular.index(
      authenticatedConnection,
      {
        body: {
          sort: "new",
          pageSize: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(newSortResponse);
  // Verify posts are ordered by created_at DESC
  const newPosts = newSortResponse.data;
  for (let i = 1; i < newPosts.length; i++) {
    const prevDate = new Date(newPosts[i - 1].created_at).getTime();
    const currDate = new Date(newPosts[i].created_at).getTime();
    TestValidator.predicate(
      "new sort: posts ordered by created_at DESC",
      prevDate >= currDate,
    );
  }
  // 4. Test sort="top" with various time periods
  const timePeriods: Array<
    "today" | "this_week" | "this_month" | "this_year" | "all_time"
  > = ["today", "this_week", "this_month", "this_year", "all_time"];
  for (const timePeriod of timePeriods) {
    const topSortResponse =
      await api.functional.redditCommunity.guest.feeds.popular.index(
        authenticatedConnection,
        {
          body: {
            sort: "top",
            timePeriod,
            pageSize: 10,
          } satisfies IRedditCommunityPost.IRequest,
        },
      );
    typia.assert(topSortResponse);
    const topPosts = topSortResponse.data;
    if (topPosts.length > 1) {
      // Verify posts are ordered by vote_score DESC
      for (let i = 1; i < topPosts.length; i++) {
        const prevScore = topPosts[i - 1].vote_score;
        const currScore = topPosts[i].vote_score;
        TestValidator.predicate(
          `top sort with ${timePeriod}: posts ordered by vote_score DESC`,
          prevScore >= currScore,
        );
      }
    }
    // Verify pagination metadata is present
    TestValidator.equals(
      `top sort ${timePeriod}: pagination has valid current`,
      topSortResponse.pagination.current,
      1,
    );
    TestValidator.equals(
      `top sort ${timePeriod}: pagination has valid limit`,
      topSortResponse.pagination.limit,
      10,
    );
    TestValidator.predicate(
      `top sort ${timePeriod}: pagination has valid records`,
      topSortResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      `top sort ${timePeriod}: pagination has valid pages`,
      topSortResponse.pagination.pages >= 0,
    );
  }
  // 5. Test sort="controversial" - polarized opinions ranking
  const controversialResponse =
    await api.functional.redditCommunity.guest.feeds.popular.index(
      authenticatedConnection,
      {
        body: {
          sort: "controversial",
          pageSize: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(controversialResponse);
  const controversialPosts = controversialResponse.data;
  if (controversialPosts.length > 1) {
    // Verify posts are ordered by absolute vote score DESC
    for (let i = 1; i < controversialPosts.length; i++) {
      const prevAbsScore = Math.abs(controversialPosts[i - 1].vote_score);
      const currAbsScore = Math.abs(controversialPosts[i].vote_score);
      TestValidator.predicate(
        "controversial sort: posts ordered by absolute vote_score DESC",
        prevAbsScore >= currAbsScore,
      );
    }
  }
  // Verify all posts have required fields
  for (const post of newPosts) {
    TestValidator.equals("new sort post has id", post.id !== undefined, true);
    TestValidator.equals(
      "new sort post has title",
      typeof post.title === "string",
      true,
    );
    TestValidator.equals(
      "new sort post has post_type",
      ["text", "link", "image"].includes(post.post_type),
      true,
    );
    TestValidator.equals(
      "new sort post has vote_score",
      typeof post.vote_score === "number",
      true,
    );
    TestValidator.equals(
      "new sort post has comment_count",
      typeof post.comment_count === "number",
      true,
    );
    TestValidator.equals(
      "new sort post has created_at",
      typeof post.created_at === "string",
      true,
    );
    TestValidator.equals(
      "new sort post has updated_at",
      typeof post.updated_at === "string",
      true,
    );
    TestValidator.equals(
      "new sort post has deleted_at",
      post.deleted_at === null || typeof post.deleted_at === "string",
      true,
    );
    TestValidator.equals(
      "new sort post has author",
      post.author !== undefined,
      true,
    );
    TestValidator.equals(
      "new sort post has community",
      post.community !== undefined,
      true,
    );
  }
  // 6. Test that timePeriod is ignored for non-top sorts
  const newSortWithTimePeriod =
    await api.functional.redditCommunity.guest.feeds.popular.index(
      authenticatedConnection,
      {
        body: {
          sort: "new",
          timePeriod: "today" as const, // Should be ignored for "new" sort
          pageSize: 5,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(newSortWithTimePeriod);
  // Response should still return posts (timePeriod doesn't cause error)
  TestValidator.predicate(
    "new sort with timePeriod: returns valid response",
    newSortWithTimePeriod.data.length >= 0,
  );
  // 7. Test sort="hot" (default)
  const hotSortResponse =
    await api.functional.redditCommunity.guest.feeds.popular.index(
      authenticatedConnection,
      {
        body: {
          sort: "hot",
          pageSize: 5,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(hotSortResponse);
  const hotPosts = hotSortResponse.data;
  TestValidator.predicate(
    "hot sort: returns valid response",
    hotPosts.length >= 0,
  );
  // 8. Test default sort (no sort parameter)
  const defaultSortResponse =
    await api.functional.redditCommunity.guest.feeds.popular.index(
      authenticatedConnection,
      {
        body: {
          pageSize: 5,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(defaultSortResponse);
  TestValidator.predicate(
    "default sort: returns valid response",
    defaultSortResponse.data.length >= 0,
  );
  // 9. Test pagination with different page numbers
  const page1Response =
    await api.functional.redditCommunity.guest.feeds.popular.index(
      authenticatedConnection,
      {
        body: {
          sort: "new",
          page: 1,
          limit: 5,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(page1Response);
  const page2Response =
    await api.functional.redditCommunity.guest.feeds.popular.index(
      authenticatedConnection,
      {
        body: {
          sort: "new",
          page: 2,
          limit: 5,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "pagination page numbers differ",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination page 2 current",
    page2Response.pagination.current,
    2,
  );
  // 10. Verify all responses have required post fields
  const allResponses = [
    newSortResponse,
    page1Response,
    page2Response,
    hotSortResponse,
    defaultSortResponse,
    ...(await Promise.all(
      timePeriods.map((tp) =>
        api.functional.redditCommunity.guest.feeds.popular.index(
          authenticatedConnection,
          {
            body: {
              sort: "top",
              timePeriod: tp,
              pageSize: 5,
            } satisfies IRedditCommunityPost.IRequest,
          },
        ),
      ),
    )),
    controversialResponse,
    newSortWithTimePeriod,
  ];
  for (const response of allResponses) {
    typia.assert(response);
    for (const post of response.data) {
      TestValidator.equals("post has id", typeof post.id === "string", true);
      TestValidator.equals(
        "post has title",
        typeof post.title === "string",
        true,
      );
      TestValidator.equals(
        "post has post_type",
        ["text", "link", "image"].includes(post.post_type),
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
      TestValidator.equals(
        "post has updated_at",
        typeof post.updated_at === "string",
        true,
      );
      TestValidator.equals("post has author", post.author !== undefined, true);
      TestValidator.equals(
        "post has community",
        post.community !== undefined,
        true,
      );
    }
  }
}
