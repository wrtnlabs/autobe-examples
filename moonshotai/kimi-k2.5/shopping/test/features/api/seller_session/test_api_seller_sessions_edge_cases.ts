import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sessions_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller with known IP to establish session records
  const sellerConnection: api.IConnection = { host: connection.host };
  const knownIp = "192.168.1.100";
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: knownIp,
    },
  });
  // Step 2: Test IP partial match filter
  const ipPartialMatchResult =
    await api.functional.ecommerceMall.seller.sessions.index(sellerConnection, {
      body: {
        ip: "192.168",
      } satisfies IEcommerceMallCustomerSession.IRequest,
    });
  typia.assert(ipPartialMatchResult);
  TestValidator.predicate(
    "IP partial match should return results",
    ipPartialMatchResult.data.length > 0,
  );
  TestValidator.predicate(
    "Session IP should contain filter substring",
    ipPartialMatchResult.data.some((session) => session.ip.includes("192.168")),
  );
  // Step 3: Test filter that produces no results (expiredAtTo with past date)
  const emptyResult = await api.functional.ecommerceMall.seller.sessions.index(
    sellerConnection,
    {
      body: {
        expiredAtTo: "2000-01-01T00:00:00.000Z",
      } satisfies IEcommerceMallCustomerSession.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data array", emptyResult.data, []);
  TestValidator.equals(
    "pagination records should be 0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    emptyResult.pagination.pages,
    0,
  );
  // Step 4: Test pagination boundary conditions (page=1, limit=1)
  const paginationResult =
    await api.functional.ecommerceMall.seller.sessions.index(sellerConnection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies IEcommerceMallCustomerSession.IRequest,
    });
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    paginationResult.data.length <= 1,
  );
  TestValidator.predicate(
    "total records should be tracked",
    paginationResult.pagination.records >= 0,
  );
}
