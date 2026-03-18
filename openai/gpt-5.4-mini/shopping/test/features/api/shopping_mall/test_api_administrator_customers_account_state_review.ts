import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_customers_account_state_review(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(admin);
  const bannedPage =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          accountStatus: "banned",
          page: 1,
          limit: 10,
          sort: "-createdAt",
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(bannedPage);
  TestValidator.predicate(
    "banned pagination current page is at least 1",
    bannedPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "banned pagination limit is positive",
    bannedPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "banned pagination records is non-negative",
    bannedPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "banned pagination pages is non-negative",
    bannedPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "banned page size does not exceed page limit",
    bannedPage.data.length <= bannedPage.pagination.limit,
  );
  TestValidator.predicate(
    "banned pagination records cover returned data",
    bannedPage.pagination.records >= bannedPage.data.length,
  );
  for (const customer of bannedPage.data) {
    TestValidator.equals(
      "filtered banned customer status",
      customer.accountStatus,
      "banned",
    );
    TestValidator.predicate(
      "banned customer has bannedAt set",
      customer.bannedAt !== null,
    );
    TestValidator.equals(
      "banned customer deletedAt is null",
      customer.deletedAt,
      null,
    );
  }
  const deletedPage =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          accountStatus: "deleted",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(deletedPage);
  TestValidator.predicate(
    "deleted pagination current page is at least 1",
    deletedPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "deleted pagination limit is positive",
    deletedPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "deleted pagination records is non-negative",
    deletedPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "deleted pagination pages is non-negative",
    deletedPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "deleted page size does not exceed page limit",
    deletedPage.data.length <= deletedPage.pagination.limit,
  );
  TestValidator.predicate(
    "deleted pagination records cover returned data",
    deletedPage.pagination.records >= deletedPage.data.length,
  );
  for (const customer of deletedPage.data) {
    TestValidator.equals(
      "filtered deleted customer status",
      customer.accountStatus,
      "deleted",
    );
    TestValidator.predicate(
      "deleted customer has deletedAt set",
      customer.deletedAt !== null,
    );
  }
}
