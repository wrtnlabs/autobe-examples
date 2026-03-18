import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_communities_search_sequential_queries_no_mixing_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Use distinct search strings for sequential isolation.
  const namePart1 = `${RandomGenerator.alphabets(6)}-${RandomGenerator.alphabets(6)}`;
  const namePart2 = `${RandomGenerator.alphabets(6)}-${RandomGenerator.alphabets(6)}`;
  // 1) Register member account A.
  const memberConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(memberA);
  const pageSize = 3;
  // 2) First search: namePart1 page=1.
  const result1 = await api.functional.communityPlatform.communities.index(
    memberConnection,
    {
      body: {
        search: namePart1,
        page: 1,
        limit: pageSize,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(result1);
  // 3) Second search immediately: namePart2 page=1.
  const result2 = await api.functional.communityPlatform.communities.index(
    memberConnection,
    {
      body: {
        search: namePart2,
        page: 1,
        limit: pageSize,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(result2);
  // 4) Pagination for first search: page=2.
  const result3 = await api.functional.communityPlatform.communities.index(
    memberConnection,
    {
      body: {
        search: namePart1,
        page: 2,
        limit: pageSize,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(result3);
  // 5) Pagination for second search: page=2.
  const result4 = await api.functional.communityPlatform.communities.index(
    memberConnection,
    {
      body: {
        search: namePart2,
        page: 2,
        limit: pageSize,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(result4);
  const ids1p1 = result1.data.map((x) => x.id);
  const ids2p1 = result2.data.map((x) => x.id);
  const ids1p2 = result3.data.map((x) => x.id);
  const ids2p2 = result4.data.map((x) => x.id);
  // No mixing: if both searches yield non-empty datasets, they should differ.
  if (ids1p1.length > 0 && ids2p1.length > 0) {
    TestValidator.notEquals(
      "no mixing between sequential searches (ids page1)",
      ids1p1,
      ids2p1,
    );
  }
  if (ids1p2.length > 0 && ids2p2.length > 0) {
    TestValidator.notEquals(
      "no mixing between sequential searches (ids page2)",
      ids1p2,
      ids2p2,
    );
  }
  // Pagination correctness.
  TestValidator.equals(
    "pagination current page=2 (search1)",
    result3.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination current page=2 (search2)",
    result4.pagination.current,
    2,
  );
  const validatePagination = (
    label: string,
    page: IPageICommunityPlatformCommunity.ISummary,
  ) => {
    const { pagination } = page;
    const { records, limit, pages } = pagination;
    const computedPages = records === 0 ? 0 : Math.ceil(records / limit);
    TestValidator.equals(`${label} pages computed`, pages, computedPages);
    TestValidator.predicate(`${label} limit positive`, limit > 0);
  };
  validatePagination("search1 page2", result3);
  validatePagination("search2 page2", result4);
  // subscriber_count correctness (best-effort with available API):
  // typia.assert validated it exists and is int32; ensure non-negative.
  const validateSubscriberCounts = (
    label: string,
    page: IPageICommunityPlatformCommunity.ISummary,
  ) => {
    for (const c of page.data) {
      TestValidator.predicate(
        `${label} subscriber_count >= 0`,
        c.subscriber_count >= 0,
      );
    }
  };
  validateSubscriberCounts("search1 page1", result1);
  validateSubscriberCounts("search2 page1", result2);
  validateSubscriberCounts("search1 page2", result3);
  validateSubscriberCounts("search2 page2", result4);
}
