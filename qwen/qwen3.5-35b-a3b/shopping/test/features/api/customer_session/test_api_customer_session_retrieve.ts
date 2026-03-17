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

export async function test_api_customer_session_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registers to create account and establish session
  const customerConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinOutput);
  // Extract session ID from the joined response
  const sessionId = joinOutput.id;
  // 2. Customer retrieves their own session record
  const retrieveConnection: api.IConnection = { host: connection.host };
  const session = await api.functional.ecommerceMall.customer.sessions.at(
    retrieveConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // 3. Validate session structure
  // All fields validated by typia.assert above, test business logic
  // Validate session ID format
  TestValidator.equals(
    "session ID exists and is non-empty",
    session.id.length,
    36,
  );
  // Validate token values are strings
  TestValidator.equals(
    "access token is string",
    typeof session.access_token,
    "string",
  );
  TestValidator.equals(
    "refresh token is string",
    typeof session.refresh_token,
    "string",
  );
  // Validate connection metadata
  TestValidator.equals("IP address is string", typeof session.ip, "string");
  TestValidator.equals("href is string", typeof session.href, "string");
  TestValidator.equals(
    "referrer is string or null",
    session.referrer === null || typeof session.referrer === "string",
    true,
  );
  // Validate expired_at is in the future (active session)
  const now = new Date().toISOString();
  TestValidator.predicate(
    "expired_at is in future for active session",
    session.expired_at > now,
  );
  // Validate deleted_at is null (active session)
  TestValidator.equals(
    "deleted_at is null for active session",
    session.deleted_at,
    null,
  );
  // Validate customer summary
  typia.assert<IEcommerceMallCustomer.ISummary>(session.customer);
  TestValidator.equals(
    "customer ID is non-empty",
    session.customer.id.length,
    36,
  );
  TestValidator.equals(
    "customer email exists",
    session.customer.email.length,
    1,
  );
  TestValidator.equals(
    "customer status exists",
    session.customer.status.length,
    1,
  );
  TestValidator.equals(
    "customer created_at is valid date-time",
    session.customer.created_at.length,
    24,
  );
  TestValidator.equals(
    "customer deleted_at is null",
    session.customer.deleted_at,
    null,
  );
}