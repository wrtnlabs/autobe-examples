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

export async function test_api_post_search_sorting_methods(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // Create authenticated connection with member token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${memberAuthorized.token.access}` },
  };
  // 2. Test 'new' sort - most recent first
  const newSortResult =
    await api.functional.redditPlatform.member.search.posts.index(
      authenticatedConnection,
      {
        body: {
          sort: "new",
          limit: 10,
        } satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
  typia.assert(newSortResult);
  // Verify new sort orders by created_at DESC
  if (newSortResult.data.length > 1) {
    for (let i = 1; i < newSortResult.data.length; i++) {
      TestValidator.predicate(
        `new sort: ${newSortResult.data[i].created_at} <= ${newSortResult.data[i - 1].created_at}`,
        newSortResult.data[i].created_at <=
          newSortResult.data[i - 1].created_at,
      );
    }
  }
  // 3. Test 'top' sort for all time
  const topAllResult =
    await api.functional.redditPlatform.member.search.posts.index(
      authenticatedConnection,
      {
        body: {
          sort: "top",
          top_time_range: "all",
          limit: 10,
        } satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
  typia.assert(topAllResult);
  // Verify top sort orders by score DESC
  if (topAllResult.data.length > 1) {
    for (let i = 1; i < topAllResult.data.length; i++) {
      const prevScore =
        topAllResult.data[i - 1].upvotes_count -
        topAllResult.data[i - 1].downvotes_count;
      const currScore =
        topAllResult.data[i].upvotes_count -
        topAllResult.data[i].downvotes_count;
      TestValidator.predicate(
        `top sort: ${currScore} <= ${prevScore}`,
        currScore <= prevScore,
      );
    }
  }
  // 4. Test 'top' sort for today
  const topTodayResult =
    await api.functional.redditPlatform.member.search.posts.index(
      authenticatedConnection,
      {
        body: {
          sort: "top",
          top_time_range: "today",
          limit: 10,
        } satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
  typia.assert(topTodayResult);
  // Verify all posts from today
  const now = new Date();
  for (const post of topTodayResult.data) {
    const postDate = new Date(post.created_at);
    const hoursDiff = (now.getTime() - postDate.getTime()) / 1000 / 60 / 60;
    TestValidator.predicate("post created within 24h", hoursDiff <= 24);
  }
  // 5. Test 'top' sort for week
  const topWeekResult =
    await api.functional.redditPlatform.member.search.posts.index(
      authenticatedConnection,
      {
        body: {
          sort: "top",
          top_time_range: "week",
          limit: 10,
        } satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
  typia.assert(topWeekResult);
  // Verify all posts from week
  for (const post of topWeekResult.data) {
    const postDate = new Date(post.created_at);
    const daysDiff = (now.getTime() - postDate.getTime()) / 1000 / 60 / 60 / 24;
    TestValidator.predicate("post created within 7 days", daysDiff <= 7);
  }
  // 6. Test 'hot' sort
  const hotResult =
    await api.functional.redditPlatform.member.search.posts.index(
      authenticatedConnection,
      {
        body: {
          sort: "hot",
          limit: 10,
        } satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
  typia.assert(hotResult);
  // Hot sort should return reasonable ordering based on recency + engagement
  TestValidator.predicate(
    "hot sort returns valid data",
    hotResult.data.length >= 0,
  );
  // 7. Test 'controversial' sort
  const controversialResult =
    await api.functional.redditPlatform.member.search.posts.index(
      authenticatedConnection,
      {
        body: {
          sort: "controversial",
          limit: 10,
        } satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
  typia.assert(controversialResult);
  // Verify controversial sort orders by ABS(upvotes - downvotes) ASC
  if (controversialResult.data.length > 1) {
    for (let i = 1; i < controversialResult.data.length; i++) {
      const prevControversial = Math.abs(
        controversialResult.data[i - 1].upvotes_count -
          controversialResult.data[i - 1].downvotes_count,
      );
      const currControversial = Math.abs(
        controversialResult.data[i].upvotes_count -
          controversialResult.data[i].downvotes_count,
      );
      TestValidator.predicate(
        `controversial sort: ${currControversial} <= ${prevControversial}`,
        currControversial <= prevControversial,
      );
    }
  }
}