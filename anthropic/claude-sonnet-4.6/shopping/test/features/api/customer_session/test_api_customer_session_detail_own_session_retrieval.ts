import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdminSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_detail_own_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer and get an authenticated connection
  const customerConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(1),
    phone: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // Step 2: List sessions to get the session UUID created during join
  const sessionList = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallSuperAdminSession.IRequest,
    },
  );
  typia.assert(sessionList);
  // Find the first session in the list (the one just created)
  TestValidator.predicate(
    "session list has at least one record",
    sessionList.data.length > 0,
  );
  const sessionSummary = sessionList.data[0]!;
  const sessionId = sessionSummary.id;
  // Step 3: Retrieve the full session details by sessionId
  const sessionDetail = await api.functional.shoppingMall.customer.sessions.at(
    customerConnection,
    {
      sessionId,
    },
  );
  typia.assert(sessionDetail);
  // Step 4: Validate the session details
  // id matches the requested sessionId
  TestValidator.equals(
    "session id matches requested sessionId",
    sessionDetail.id,
    sessionId,
  );
  // customer email matches the registered email
  TestValidator.equals(
    "customer email matches registered email",
    sessionDetail.customer.email,
    joinInput.email,
  );
  // customer is not banned
  TestValidator.equals(
    "customer is not banned",
    sessionDetail.customer.isBanned,
    false,
  );
  // access_token is non-empty
  TestValidator.predicate(
    "access_token is non-empty",
    sessionDetail.access_token.length > 0,
  );
  // refresh_token is non-empty
  TestValidator.predicate(
    "refresh_token is non-empty",
    sessionDetail.refresh_token.length > 0,
  );
  // expired_at is later than created_at (session is active)
  TestValidator.predicate(
    "expired_at is later than created_at",
    new Date(sessionDetail.expired_at) > new Date(sessionDetail.created_at),
  );
  // expired_at is in the future (session is still active)
  TestValidator.predicate(
    "session is still active (expired_at in the future)",
    new Date(sessionDetail.expired_at) > new Date(),
  );
}
