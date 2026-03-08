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

/**
 * Customer successfully retrieves detailed information about their own active authentication session.
 * The test verifies that session details include all expected fields: session ID (UUID), IP address,
 * page href, referrer URL, creation timestamp, expiration timestamp, and embedded customer summary.
 */
export async function test_api_customer_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer (session created automatically during join)
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Generate a valid session ID (works in simulation mode)
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve specific session
  const session = await api.functional.ecommerceMall.customer.sessions.at(
    customerConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 4. Validate session details
  TestValidator.equals("session ID matches", session.id, sessionId);
  TestValidator.predicate("has valid IP address", session.ip.length > 0);
  TestValidator.predicate("has valid href URI", session.href.length > 0);
  TestValidator.predicate(
    "has valid referrer URI",
    session.referrer.length > 0,
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    session.created_at.length > 0,
  );
  TestValidator.predicate(
    "has valid expired_at timestamp",
    session.expired_at.length > 0,
  );
  // 5. Validate customer summary embedded in session
  TestValidator.equals(
    "customer ID matches authorized user",
    session.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer email matches authorized user",
    session.customer.email,
    authorized.email,
  );
  TestValidator.predicate(
    "customer has display_name",
    session.customer.display_name === authorized.display_name,
  );
  TestValidator.predicate(
    "customer has phone_number",
    session.customer.phone_number === authorized.phone_number,
  );
  TestValidator.predicate(
    "customer account status is active",
    session.customer.account_status === "active",
  );
}
