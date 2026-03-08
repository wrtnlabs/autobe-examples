import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_users_list_pagination_behavior(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Test page 1 (first page)
  const page1 = await api.functional.redditPlatform.users.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 20);
  TestValidator.predicate("page 1 has records", page1.pagination.records > 0);
  TestValidator.predicate("page 1 has data", page1.data.length > 0);
  // 3. Calculate and request last page
  const lastPageNumber = page1.pagination.pages;
  const lastPage = await api.functional.redditPlatform.users.index(
    memberConnection,
    {
      body: {
        page: lastPageNumber,
        limit: 20,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(lastPage);
  TestValidator.equals(
    "last page current",
    lastPage.pagination.current,
    lastPageNumber,
  );
  TestValidator.equals("last page limit", lastPage.pagination.limit, 20);
  // 4. Request page beyond available pages
  const beyondLastPage = await api.functional.redditPlatform.users.index(
    memberConnection,
    {
      body: {
        page: lastPageNumber + 1,
        limit: 20,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(beyondLastPage);
  TestValidator.equals(
    "beyond last page current",
    beyondLastPage.pagination.current,
    lastPageNumber + 1,
  );
  TestValidator.equals(
    "beyond last page records",
    beyondLastPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "beyond last page pages",
    beyondLastPage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "beyond last page data empty",
    beyondLastPage.data.length,
    0,
  );
  // 5. Test minimum limit (1)
  const minLimitPage = await api.functional.redditPlatform.users.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(minLimitPage);
  TestValidator.equals(
    "min limit pagination limit",
    minLimitPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "min limit has data or no records",
    minLimitPage.data.length > 0 || minLimitPage.pagination.records === 0,
  );
  // 6. Test maximum limit (100)
  const maxLimitPage = await api.functional.redditPlatform.users.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit pagination limit",
    maxLimitPage.pagination.limit,
    100,
  );
  // 7. Test sorting and filtering combination
  const sortedFilteredPage = await api.functional.redditPlatform.users.index(
    memberConnection,
    {
      body: {
        displayName: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<20>
        >(),
        sortBy: "karmaScore" satisfies
          | "karmaScore"
          | "createdAt"
          | "subscriptionCount",
        sortOrder: "DESC" satisfies "ASC" | "DESC",
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(sortedFilteredPage);
  TestValidator.predicate(
    "sorted filtered pagination has records",
    sortedFilteredPage.pagination.records > 0,
  );
  // 8. Verify subscriptionCount field exists in data
  if (sortedFilteredPage.data.length > 0) {
    const firstUser = sortedFilteredPage.data[0];
    TestValidator.predicate(
      "subscriptionCount is non-negative",
      firstUser.subscriptionCount >= 0,
    );
    typia.assert(firstUser);
  }
}
