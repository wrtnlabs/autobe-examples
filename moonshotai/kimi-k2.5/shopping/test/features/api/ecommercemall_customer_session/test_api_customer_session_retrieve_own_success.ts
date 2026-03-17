import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_retrieve_own_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for the customer actor
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Register a new customer and establish an authenticated session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEcommerceMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // 2. Capture the session ID from the join response
  // Validate that the join response includes the sessionId field as expected
  const authorizedWithSession = typia.assert<
    IEcommerceMallCustomer.IAuthorized & {
      sessionId: string & tags.Format<"uuid">;
    }
  >(authorized);
  const sessionId = authorizedWithSession.sessionId;
  // 3. Retrieve the session details using the captured session ID
  const session = await api.functional.ecommerceMall.customer.sessions.at(
    customerConnection,
    { sessionId },
  );
  typia.assert(session);
  // 4. Validate session details match expected structure and data
  TestValidator.equals("session ID matches request", session.id, sessionId);
  TestValidator.equals(
    "customer email matches",
    session.customer.email,
    authorized.email,
  );
  TestValidator.predicate(
    "session has valid customer summary",
    typeof session.customer.id === "string" &&
      typeof session.customer.createdAt === "string" &&
      typeof session.customer.updatedAt === "string",
  );
  TestValidator.predicate(
    "session has IP address",
    typeof session.ip === "string",
  );
  TestValidator.predicate(
    "session has href URL",
    typeof session.href === "string",
  );
  TestValidator.predicate(
    "session has referrer",
    typeof session.referrer === "string",
  );
  TestValidator.predicate(
    "session has createdAt timestamp",
    typeof session.createdAt === "string",
  );
  TestValidator.predicate(
    "session has expiredAt timestamp",
    typeof session.expiredAt === "string",
  );
}
