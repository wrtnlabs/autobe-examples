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

export async function test_api_session_index_empty_result_for_unmatched_filters(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: "203.0.113.10" as string & tags.Format<"ipv4">,
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const unmatchedRequest = {
    ip: "198.51.100.77" as string & tags.Format<"ipv4">,
    createdAtFrom: new Date("2000-01-01T00:00:00.000Z").toISOString(),
    createdAtTo: new Date("2000-01-02T00:00:00.000Z").toISOString(),
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortDirection: "desc",
  } satisfies IShoppingMallSellerSession.IRequest;
  const emptyResult = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: unmatchedRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals("unmatched result is empty", emptyResult.data.length, 0);
  TestValidator.equals(
    "unmatched pagination current page",
    emptyResult.pagination.current,
    unmatchedRequest.page,
  );
  TestValidator.equals(
    "unmatched pagination limit",
    emptyResult.pagination.limit,
    unmatchedRequest.limit,
  );
  TestValidator.equals(
    "unmatched pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "unmatched pagination pages",
    emptyResult.pagination.pages,
    0,
  );
  const matchedRequest = {
    ip: joinBody.ip,
    href: joinBody.href,
    referrer: joinBody.referrer,
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortDirection: "desc",
  } satisfies IShoppingMallSellerSession.IRequest;
  const matchedResult =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: matchedRequest,
      },
    );
  typia.assert(matchedResult);
  TestValidator.predicate(
    "matched search returns at least one session",
    matchedResult.data.length > 0,
  );
  TestValidator.predicate(
    "matched search preserves original session metadata",
    matchedResult.data.some(
      (session) =>
        session.ip === joinBody.ip &&
        session.href === joinBody.href &&
        session.referrer === joinBody.referrer,
    ),
  );
}
