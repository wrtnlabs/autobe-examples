import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_popular_feed_sorting_strategies(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "Test1234!",
      displayName: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Test 1: 'new' sorting strategy
  const newConnection: api.IConnection = { host: connection.host };
  const newResult =
    await api.functional.redditPlatform.member.posts.feed.popular.index(
      newConnection,
      {
        body: {
          sortBy: "new",
          sortDirection: "desc",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(newResult);
  // Validate 'new' sort returns structured response
  TestValidator.equals(
    "new sort pagination current",
    newResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "new sort pagination limit",
    newResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "new sort pagination valid",
    newResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "new sort pagination records valid",
    newResult.pagination.records >= 0,
  );
  // Test 2: 'hot' sorting strategy
  const hotConnection: api.IConnection = { host: connection.host };
  const hotResult =
    await api.functional.redditPlatform.member.posts.feed.popular.index(
      hotConnection,
      {
        body: {
          sortBy: "hot",
          sortDirection: "desc",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(hotResult);
  // Validate 'hot' sort returns structured response
  TestValidator.equals(
    "hot sort pagination current",
    hotResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "hot sort pagination limit",
    hotResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "hot sort pagination valid",
    hotResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "hot sort pagination records valid",
    hotResult.pagination.records >= 0,
  );
  // Test 3: 'top' sorting strategy
  const topConnection: api.IConnection = { host: connection.host };
  const topResult =
    await api.functional.redditPlatform.member.posts.feed.popular.index(
      topConnection,
      {
        body: {
          sortBy: "top",
          sortDirection: "desc",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(topResult);
  // Validate 'top' sort returns structured response
  TestValidator.equals(
    "top sort pagination current",
    topResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "top sort pagination limit",
    topResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "top sort pagination valid",
    topResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "top sort pagination records valid",
    topResult.pagination.records >= 0,
  );
  // Test 4: 'controversial' sorting strategy
  const controversialConnection: api.IConnection = { host: connection.host };
  const controversialResult =
    await api.functional.redditPlatform.member.posts.feed.popular.index(
      controversialConnection,
      {
        body: {
          sortBy: "controversial",
          sortDirection: "desc",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(controversialResult);
  // Validate 'controversial' sort returns structured response
  TestValidator.equals(
    "controversial sort pagination current",
    controversialResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "controversial sort pagination limit",
    controversialResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "controversial sort pagination valid",
    controversialResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "controversial sort pagination records valid",
    controversialResult.pagination.records >= 0,
  );
  // Validate all sorting strategies return consistent pagination structure
  TestValidator.equals(
    "all sorts have same page number",
    newResult.pagination.current,
    hotResult.pagination.current,
  );
  TestValidator.equals(
    "all sorts have same page number",
    hotResult.pagination.current,
    topResult.pagination.current,
  );
  TestValidator.equals(
    "all sorts have same page number",
    topResult.pagination.current,
    controversialResult.pagination.current,
  );
  // Validate limit consistency across all sorts
  TestValidator.equals(
    "all sorts have same limit",
    newResult.pagination.limit,
    hotResult.pagination.limit,
  );
  TestValidator.equals(
    "all sorts have same limit",
    hotResult.pagination.limit,
    topResult.pagination.limit,
  );
  TestValidator.equals(
    "all sorts have same limit",
    topResult.pagination.limit,
    controversialResult.pagination.limit,
  );
  // Validate records count consistency across all sorts
  TestValidator.equals(
    "all sorts return same record count",
    newResult.pagination.records,
    hotResult.pagination.records,
  );
  TestValidator.equals(
    "all sorts return same record count",
    hotResult.pagination.records,
    topResult.pagination.records,
  );
  TestValidator.equals(
    "all sorts return same record count",
    topResult.pagination.records,
    controversialResult.pagination.records,
  );
  // Validate each sorting strategy returns data array
  TestValidator.predicate(
    "new sort returns data array",
    Array.isArray(newResult.data),
  );
  TestValidator.predicate(
    "hot sort returns data array",
    Array.isArray(hotResult.data),
  );
  TestValidator.predicate(
    "top sort returns data array",
    Array.isArray(topResult.data),
  );
  TestValidator.predicate(
    "controversial sort returns data array",
    Array.isArray(controversialResult.data),
  );
  // Validate each post in data array has required structure (first post only, if exists)
  if (newResult.data.length > 0) {
    typia.assert(newResult.data[0]);
    TestValidator.predicate(
      "new sort first post has id",
      newResult.data[0].id !== undefined,
    );
    TestValidator.predicate(
      "new sort first post has title",
      newResult.data[0].title !== undefined,
    );
    TestValidator.predicate(
      "new sort first post has vote_score",
      newResult.data[0].vote_score !== undefined,
    );
    TestValidator.predicate(
      "new sort first post has author",
      newResult.data[0].author !== undefined,
    );
    TestValidator.predicate(
      "new sort first post has community",
      newResult.data[0].community !== undefined,
    );
    TestValidator.predicate(
      "new sort first post has created_at",
      newResult.data[0].created_at !== undefined,
    );
  }
  if (hotResult.data.length > 0) {
    typia.assert(hotResult.data[0]);
    TestValidator.predicate(
      "hot sort first post has id",
      hotResult.data[0].id !== undefined,
    );
  }
  if (topResult.data.length > 0) {
    typia.assert(topResult.data[0]);
    TestValidator.predicate(
      "top sort first post has id",
      topResult.data[0].id !== undefined,
    );
  }
  if (controversialResult.data.length > 0) {
    typia.assert(controversialResult.data[0]);
    TestValidator.predicate(
      "controversial sort first post has id",
      controversialResult.data[0].id !== undefined,
    );
  }
}
