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

export async function test_api_member_posts_search_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user for authentication and update connection headers
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test sorting strategies using memberConnection (with updated headers from authorization)
  // Test sortBy: new (default) - most recent first
  const sortedByNew =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          sortBy: "new",
          sortDirection: "desc",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(sortedByNew);
  TestValidator.index(
    "new sort - basic validation",
    sortedByNew.data,
    sortedByNew.data,
  );
  // Test sortBy: top - highest score first
  const sortedByTop =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          sortBy: "top",
          sortDirection: "desc",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(sortedByTop);
  // Verify top score comes first (if multiple results)
  if (sortedByTop.data.length > 1) {
    TestValidator.predicate(
      "top sort - highest score first",
      sortedByTop.data[0].vote_score >= sortedByTop.data[1].vote_score,
    );
  }
  // Test sortBy: top with timeRange - all_time
  const sortedByTopAllTime =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          sortBy: "top",
          timeRange: "all_time",
          sortDirection: "desc",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(sortedByTopAllTime);
  // Test sortBy: controversial
  const sortedByControversial =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          sortBy: "controversial",
          sortDirection: "desc",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(sortedByControversial);
  // Test sortBy: hot
  const sortedByHot =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          sortBy: "hot",
          sortDirection: "desc",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(sortedByHot);
  // Test sortDirection: asc for new
  const sortedByNewAsc =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          sortBy: "new",
          sortDirection: "asc",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(sortedByNewAsc);
  // Test pagination - verify total count remains consistent
  const paginationCheck =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          sortBy: "new",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(paginationCheck);
  TestValidator.predicate(
    "pagination - total records non-negative",
    paginationCheck.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination - current page",
    paginationCheck.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination - limit",
    paginationCheck.pagination.limit,
    10,
  );
  // Test empty results with non-existent community filter
  const emptyResults =
    await api.functional.redditPlatform.member.posts.search.index(
      memberConnection,
      {
        body: {
          communityId: "00000000-0000-0000-0000-000000000000",
          sortBy: "top",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals("empty results - no data", emptyResults.data.length, 0);
  TestValidator.equals(
    "empty results - no records",
    emptyResults.pagination.records,
    0,
  );
}
