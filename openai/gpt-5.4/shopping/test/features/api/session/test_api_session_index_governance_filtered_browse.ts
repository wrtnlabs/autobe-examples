import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_session_index_governance_filtered_browse(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: `https://example.com/${RandomGenerator.alphabets(8)}`,
    referrer: `https://referrer.example.com/${RandomGenerator.alphabets(8)}`,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  const createdAtFrom = new Date(
    new Date(authorized.created_at).getTime() - 60000,
  ).toISOString();
  const createdAtTo = new Date(
    new Date(authorized.created_at).getTime() + 60000,
  ).toISOString();
  const page = 1;
  const limit = 10;
  const request = {
    ip: joinInput.ip,
    href: joinInput.href,
    referrer: joinInput.referrer,
    createdAtFrom,
    createdAtTo,
    isExpired: false,
    page,
    limit,
    sortBy: "createdAt",
    sortDirection: "desc",
  } satisfies IShoppingMallSellerSession.IRequest;
  const first = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(first);
  TestValidator.equals(
    "pagination current matches requested page",
    first.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    first.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "data length stays within limit",
    first.data.length <= first.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages follows ceiling formula",
    first.pagination.pages,
    first.pagination.limit === 0
      ? 0
      : Math.ceil(first.pagination.records / first.pagination.limit),
  );
  for (const row of first.data) {
    TestValidator.equals("row ip matches filter", row.ip, request.ip);
    TestValidator.equals("row href matches filter", row.href, request.href);
    TestValidator.equals(
      "row referrer matches filter",
      row.referrer,
      request.referrer,
    );
    TestValidator.predicate(
      "row created_at is within requested window",
      new Date(row.created_at).getTime() >= new Date(createdAtFrom).getTime() &&
        new Date(row.created_at).getTime() <= new Date(createdAtTo).getTime(),
    );
    TestValidator.predicate(
      "row is not expired at read time",
      new Date(row.expired_at).getTime() > Date.now(),
    );
  }
  for (let i = 1; i < first.data.length; ++i) {
    TestValidator.predicate(
      "rows are sorted by created_at descending",
      new Date(first.data[i - 1].created_at).getTime() >=
        new Date(first.data[i].created_at).getTime(),
    );
  }
  const second = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(second);
  for (const before of first.data) {
    const after = second.data.find((row) => row.id === before.id);
    if (after !== undefined) {
      TestValidator.equals(
        "read-only browse does not change expired_at",
        after.expired_at,
        before.expired_at,
      );
    }
  }
}
