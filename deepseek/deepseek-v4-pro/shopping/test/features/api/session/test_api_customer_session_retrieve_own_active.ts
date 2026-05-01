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

/**
 * Test retrieval of own active customer session after registration.
 *
 * Verifies that a newly registered customer can retrieve their own authentication session by session ID and that all session metadata fields are correctly populated. The test establishes an authenticated session through customer registration, extracts the session identifier from the JWT access token, and validates the complete session record.
 *
 * 1. Customer registers via authorize_customer_join to create an account and session.
 * 2. The JWT access token is decoded to extract the session ID (jti claim).
 * 3. The session is retrieved using the session endpoint with the extracted ID.
 * 4. Validates session metadata: id, customer summary fields (id, email, display_name, created_at, banned_at), client IP, href, referrer, created_at, and expired_at.
 * 5. Confirms the session is active: created_at is in the past and expired_at is in the future.
 */
export async function test_api_customer_session_retrieve_own_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer via join (creates session)
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Decode JWT to extract session ID
  const [, payloadBase64url] = authorized.token.access.split(".");
  const payloadJson = JSON.parse(
    Buffer.from(payloadBase64url, "base64url").toString("utf-8"),
  );
  const sessionId: string = payloadJson.jti;
  // 3. Retrieve session by ID
  const session = await api.functional.shoppingMall.customer.sessions.at(
    customerConnection,
    { sessionId },
  );
  typia.assert(session);
  // 4. Validate session identity
  TestValidator.equals("session id matches", session.id, sessionId);
  // 5. Validate customer summary against authorized response
  TestValidator.equals("customer id", session.customer.id, authorized.id);
  TestValidator.equals(
    "customer email",
    session.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "customer display_name",
    session.customer.display_name,
    authorized.display_name,
  );
  TestValidator.equals(
    "customer created_at",
    session.customer.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "customer banned_at",
    session.customer.banned_at,
    authorized.banned_at,
  );
  // 6. Validate session metadata fields
  TestValidator.predicate(
    "ip is IPv4 format",
    /^\d+\.\d+\.\d+\.\d+$/.test(session.ip),
  );
  TestValidator.predicate("href is non-empty URI", session.href.length > 0);
  TestValidator.predicate(
    "referrer is a string",
    typeof session.referrer === "string",
  );
  // 7. Validate session is active (created in past, expires in future)
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
}
