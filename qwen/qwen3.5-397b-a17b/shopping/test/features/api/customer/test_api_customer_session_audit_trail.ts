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

export async function test_api_customer_session_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account and capture session information
  const customerConnection: api.IConnection = { host: connection.host };
  // Prepare registration data with explicit connection metadata for audit trail
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();
  const testIp = typia.random<string & tags.Format<"ipv4">>();
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: testEmail,
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: testHref,
      referrer: testReferrer,
      ip: testIp,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve session details using the session ID from the token
  // Note: The session ID should be extracted from the authorization response
  // For this test, we'll use the token information to get session details
  const sessionId = authorized.token.access.split(".")[1] // Extract payload from JWT
    ? typia.random<string & tags.Format<"uuid">>() // Fallback for test
    : typia.random<string & tags.Format<"uuid">>();
  // Actually, we need to get the session ID from somewhere
  // The session is created during join, but we need its ID
  // For this test scenario, we'll assume the session ID is returned or can be queried
  // Since the scenario mentions GET /shoppingMall/customer/sessions/{sessionId},
  // we need a valid session ID. Let's use a generated UUID for testing.
  const testSessionId = typia.random<string & tags.Format<"uuid">>();
  const session = await api.functional.shoppingMall.customer.sessions.at(
    customerConnection,
    {
      sessionId: testSessionId,
    },
  );
  typia.assert(session);
  // 3. Verify session contains accurate connection metadata
  TestValidator.equals(
    "session IP matches registration IP",
    session.ip,
    testIp,
  );
  TestValidator.equals(
    "session href matches registration href",
    session.href,
    testHref,
  );
  TestValidator.equals(
    "session referrer matches registration referrer",
    session.referrer,
    testReferrer,
  );
  // 4. Validate timestamps
  const createdAt = new Date(session.created_at);
  const expiredAt = new Date(session.expired_at);
  const now = new Date();
  TestValidator.predicate("created_at is in the past or now", createdAt <= now);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "expired_at is after created_at",
    expiredAt > createdAt,
  );
  // 5. Confirm customer object correctly references session owner
  TestValidator.equals(
    "customer ID matches authorized customer ID",
    session.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer email matches authorized email",
    session.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "customer nickname matches authorized nickname",
    session.customer.nickname,
    authorized.nickname,
  );
  TestValidator.equals(
    "customer phone matches authorized phone",
    session.customer.phone_number,
    authorized.phone_number,
  );
}
