import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_customer_list_search_and_status_filter(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const search = RandomGenerator.alphabets(6);
  const firstPage =
    await api.functional.mallPlatform.administrator.customers.index(
      adminConnection,
      {
        body: {
          search,
          page: 1,
          limit: 2,
        } satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "first page should be a valid paginated response",
    firstPage.pagination.current === 1 && firstPage.pagination.limit === 2,
  );
  TestValidator.predicate(
    "pagination counters should be non-negative",
    firstPage.pagination.records >= 0 && firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all returned customers should match the search keyword",
    () => firstPage.data.every((customer) => customer.email.includes(search)),
  );
  if (firstPage.data.length > 0) {
    const status = firstPage.data[0]!.status;
    const statusFiltered =
      await api.functional.mallPlatform.administrator.customers.index(
        adminConnection,
        {
          body: {
            search,
            status,
            page: 1,
            limit: 2,
          } satisfies IMallPlatformCustomer.IRequest,
        },
      );
    typia.assert(statusFiltered);
    TestValidator.predicate(
      "status-filtered results should preserve the search keyword",
      () =>
        statusFiltered.data.every(
          (customer) =>
            customer.email.includes(search) && customer.status === status,
        ),
    );
    TestValidator.equals(
      "status filter should not change pagination limit on the same request shape",
      statusFiltered.pagination.limit,
      2,
    );
    if (firstPage.pagination.pages >= 2) {
      const secondPage =
        await api.functional.mallPlatform.administrator.customers.index(
          adminConnection,
          {
            body: {
              search,
              page: 2,
              limit: 2,
            } satisfies IMallPlatformCustomer.IRequest,
          },
        );
      typia.assert(secondPage);
      TestValidator.equals(
        "page metadata should remain stable across pages",
        {
          limit: firstPage.pagination.limit,
          records: firstPage.pagination.records,
          pages: firstPage.pagination.pages,
        },
        {
          limit: secondPage.pagination.limit,
          records: secondPage.pagination.records,
          pages: secondPage.pagination.pages,
        },
      );
      TestValidator.predicate(
        "second page should continue matching the same search keyword",
        () =>
          secondPage.data.every((customer) => customer.email.includes(search)),
      );
    }
  }
  const noMatch =
    await api.functional.mallPlatform.administrator.customers.index(
      adminConnection,
      {
        body: {
          search: `no-match-${RandomGenerator.alphaNumeric(12)}`,
          page: 1,
          limit: 2,
        } satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(noMatch);
  TestValidator.equals(
    "no-match search should return an empty result list",
    noMatch.data,
    [],
  );
  TestValidator.equals(
    "no-match search should return page 1",
    noMatch.pagination.current,
    1,
  );
  TestValidator.equals(
    "no-match search should preserve requested limit",
    noMatch.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "no-match pagination counters should remain valid",
    noMatch.pagination.records >= 0 && noMatch.pagination.pages >= 0,
  );
}
