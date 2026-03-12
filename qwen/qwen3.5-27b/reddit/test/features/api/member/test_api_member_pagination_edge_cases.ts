import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMember";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member pagination edge cases and boundary conditions.
 * 1. Create test member account
 * 2. Test page 1 with page_size=1 returns single member
 * 3. Test requesting page beyond total pages returns empty data array
 * 4. Test page_size=100 (maximum) works correctly
 * 5. Test sorting by different fields with asc and desc order
 * 6. Test search parameter on username and display_name
 * 7. Validate pagination metadata accuracy
 */
export async function test_api_member_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Test page 1 with page_size=1 returns single member
  const singlePageResult = await api.functional.redditClone.members.index(
    memberConnection,
    {
      body: {
        page: 1,
        page_size: 1,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(singlePageResult);
  TestValidator.equals(
    "page_size=1 returns single member",
    singlePageResult.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current is 1",
    singlePageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 1",
    singlePageResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "has at least 1 total record",
    singlePageResult.pagination.records >= 1,
  );
  // 3. Test requesting page beyond total pages returns empty data array
  const beyondPageResult = await api.functional.redditClone.members.index(
    memberConnection,
    {
      body: {
        page: 9999,
        page_size: 10,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond page returns empty data",
    beyondPageResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current reflects requested page",
    beyondPageResult.pagination.current,
    9999,
  );
  TestValidator.equals(
    "pagination limit is 10",
    beyondPageResult.pagination.limit,
    10,
  );
  // 4. Test page_size=100 (maximum) works correctly
  const maxPageSizeResult = await api.functional.redditClone.members.index(
    memberConnection,
    {
      body: {
        page: 1,
        page_size: 100,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(maxPageSizeResult);
  TestValidator.equals(
    "max page_size limit is 100",
    maxPageSizeResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data count does not exceed limit",
    maxPageSizeResult.data.length <= 100,
  );
  // 5. Test sorting by different fields with asc and desc order
  const sortFields = [
    "username",
    "display_name",
    "karma",
    "created_at",
    "updated_at",
  ] as const;
  const sortOrders = ["asc", "desc"] as const;
  for (const sortBy of sortFields) {
    for (const sortOrder of sortOrders) {
      const sortResult = await api.functional.redditClone.members.index(
        memberConnection,
        {
          body: {
            page: 1,
            page_size: 10,
            sort_by: sortBy,
            sort_order: sortOrder,
          } satisfies IRedditCloneMember.IRequest,
        },
      );
      typia.assert(sortResult);
      TestValidator.predicate(
        `sorting by ${sortBy} ${sortOrder} returns valid data`,
        sortResult.pagination.current === 1,
      );
    }
  }
  // 6. Test search parameter performs combined search on username and display_name
  const searchQuery = joinResult.username.substring(0, 3);
  const searchResult = await api.functional.redditClone.members.index(
    memberConnection,
    {
      body: {
        page: 1,
        page_size: 10,
        search: searchQuery,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns members matching username or display_name",
    searchResult.data.some(
      (member) =>
        member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.display_name.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );
  // 7. Validate pagination metadata accuracy
  const metadataResult = await api.functional.redditClone.members.index(
    memberConnection,
    {
      body: {
        page: 2,
        page_size: 5,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(metadataResult);
  TestValidator.equals(
    "pagination current is 2",
    metadataResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 5",
    metadataResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    metadataResult.pagination.pages ===
      Math.ceil(
        metadataResult.pagination.records / metadataResult.pagination.limit,
      ),
  );
}
