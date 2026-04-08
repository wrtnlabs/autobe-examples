import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_posts_sorting_top_with_time_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass1234",
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Test top sorting with various time range values
  // These calls validate that the sorting parameters are accepted
  // and the API returns properly structured responses
  const timeRanges: ("today" | "week" | "month" | "year" | "all")[] = [
    "today",
    "week",
    "month",
    "year",
    "all",
  ];
  for (const timeRange of timeRanges) {
    const response = await api.functional.redditPlatform.member.posts.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "top",
          topTimeRange: timeRange,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
    typia.assert(response);
    // Validate response structure
    TestValidator.equals(
      `response has pagination for ${timeRange}`,
      typeof response.pagination,
      "object",
    );
    TestValidator.predicate(
      `pagination has current page for ${timeRange}`,
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      `pagination has limit for ${timeRange}`,
      response.pagination.limit >= 1,
    );
    TestValidator.predicate(
      `pagination has records count for ${timeRange}`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination has pages count for ${timeRange}`,
      response.pagination.pages >= 0,
    );
    // Validate each post in the response has required fields
    for (const post of response.data) {
      typia.assert(post);
      TestValidator.predicate(
        `post ${post.id} has valid ID for ${timeRange}`,
        typeof post.id === "string",
      );
      TestValidator.predicate(
        `post ${post.id} has title for ${timeRange}`,
        typeof post.title === "string",
      );
      TestValidator.predicate(
        `post ${post.id} has valid post_type for ${timeRange}`,
        ["text", "link", "image"].includes(post.post_type),
      );
      TestValidator.predicate(
        `post ${post.id} has valid upvotes_count for ${timeRange}`,
        typeof post.upvotes_count === "number",
      );
      TestValidator.predicate(
        `post ${post.id} has valid downvotes_count for ${timeRange}`,
        typeof post.downvotes_count === "number",
      );
      TestValidator.predicate(
        `post ${post.id} has valid comment_count for ${timeRange}`,
        typeof post.comment_count === "number",
      );
      TestValidator.predicate(
        `post ${post.id} has author for ${timeRange}`,
        post.author !== null && typeof post.author === "object",
      );
      TestValidator.predicate(
        `post ${post.id} has community for ${timeRange}`,
        post.community !== null && typeof post.community === "object",
      );
      TestValidator.predicate(
        `post ${post.id} has valid created_at for ${timeRange}`,
        typeof post.created_at === "string",
      );
    }
  }
  // 3. Test that empty time periods return empty results
  const now = new Date();
  const futureDate = now.toISOString();
  const emptyRangeResponse =
    await api.functional.redditPlatform.member.posts.index(memberConnection, {
      body: {
        page: 1,
        limit: 20,
        sort: "top",
        topTimeRange: "today",
        startDate: futureDate,
        endDate: futureDate,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(emptyRangeResponse);
  TestValidator.equals(
    "empty time period returns empty results",
    emptyRangeResponse.data.length,
    0,
  );
  // 4. Test that sorting='new' still works alongside other parameters
  const newSortResponse =
    await api.functional.redditPlatform.member.posts.index(memberConnection, {
      body: {
        page: 1,
        limit: 20,
        sort: "new",
        topTimeRange: "all",
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(newSortResponse);
  TestValidator.equals(
    "new sort returns valid response",
    Array.isArray(newSortResponse.data),
    true,
  );
  // 5. Test determinism - calling same request twice should return same structure
  const firstCall = await api.functional.redditPlatform.member.posts.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "top",
        topTimeRange: "week",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(firstCall);
  const secondCall = await api.functional.redditPlatform.member.posts.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "top",
        topTimeRange: "week",
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(secondCall);
  TestValidator.equals(
    "deterministic results for same parameters - records count",
    firstCall.pagination.records,
    secondCall.pagination.records,
  );
  TestValidator.equals(
    "deterministic results for same parameters - data count",
    firstCall.data.length,
    secondCall.data.length,
  );
}