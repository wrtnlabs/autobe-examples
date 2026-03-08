import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Customer registers and joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(authorizedCustomer);
  // Step 2: Decode the JWT access token to extract the 'sid' (session ID) claim
  const token = authorizedCustomer.token.access;
  const payload = token.split(".")[1];
  const decodedPayload = Buffer.from(payload, "base64").toString("utf-8");
  const jwtClaims = JSON.parse(decodedPayload);
  const sessionId = jwtClaims.sid as string & tags.Format<"uuid">;
  // Step 3: Retrieve the session details
  const session = await api.functional.shoppingMall.customer.sessions.at(
    customerConnection,
    { sessionId },
  );
  typia.assert(session);
  // Step 4: Validate the session response
  TestValidator.equals("session id matches", session.id, sessionId);
  TestValidator.equals(
    "customer id matches",
    session.customer.id,
    authorizedCustomer.id,
  );
  TestValidator.equals(
    "customer email matches",
    session.customer.email,
    authorizedCustomer.email,
  );
  const now = new Date();
  const createdAt = new Date(session.created_at);
  const expiredAt = new Date(session.expired_at);
  TestValidator.predicate(
    "created_at is in the past",
    createdAt.getTime() < now.getTime(),
  );
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > now.getTime(),
  );
  // Validate session duration does not exceed 24 hours
  const sessionDurationMs = expiredAt.getTime() - createdAt.getTime();
  const maxSessionDurationMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  TestValidator.predicate(
    "session duration within 24 hours",
    sessionDurationMs <= maxSessionDurationMs,
  );
}
