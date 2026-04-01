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

export async function test_api_customer_list_browsing_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const firstPage =
    await api.functional.mallPlatform.administrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.predicate(
    "first page page-count consistency",
    firstPage.pagination.pages ===
      (firstPage.pagination.records === 0
        ? 0
        : Math.ceil(firstPage.pagination.records / firstPage.pagination.limit)),
  );
  TestValidator.predicate(
    "first page size within limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  if (firstPage.data.length > 1) {
    for (let i = 1; i < firstPage.data.length; ++i) {
      TestValidator.predicate(
        "first page ordering is stable by created_at descending",
        firstPage.data[i - 1].created_at >= firstPage.data[i].created_at,
      );
    }
  }
  for (const customer of firstPage.data) {
    typia.assert(customer);
    TestValidator.predicate("summary id populated", customer.id.length > 0);
    TestValidator.predicate(
      "summary email populated",
      customer.email.length > 0,
    );
    TestValidator.predicate(
      "summary status populated",
      customer.status.length > 0,
    );
    TestValidator.equals(
      "deleted_at is nullable",
      customer.deleted_at === null || typeof customer.deleted_at === "string",
      true,
    );
  }
  const secondPage =
    await api.functional.mallPlatform.administrator.customers.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 5);
  TestValidator.predicate(
    "second page records equal first page records",
    secondPage.pagination.records === firstPage.pagination.records,
  );
  TestValidator.predicate(
    "second page current is either 2 or clamped to the last available page",
    secondPage.pagination.current === 2 ||
      secondPage.pagination.records <= secondPage.pagination.limit,
  );
  TestValidator.predicate(
    "second page size within limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  const emptyPage =
    await api.functional.mallPlatform.administrator.customers.index(
      adminConnection,
      {
        body: {
          search:
            "definitely-not-a-real-customer-" +
            RandomGenerator.alphaNumeric(24),
          page: 1,
          limit: 10,
        } satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page data", emptyPage.data, []);
  TestValidator.equals("empty page records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty page pages", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty page current", emptyPage.pagination.current, 1);
  TestValidator.equals("empty page limit", emptyPage.pagination.limit, 10);
}
