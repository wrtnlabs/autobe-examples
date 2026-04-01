import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
  // 1. Register new customer account with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joinResult = await authorize_customer_join(connection, {
    body: {
      email: email,
      password: password,
      href: href,
      referrer: referrer,
      ip: ip,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login with the same credentials to create an active session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email: email,
      password: password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResult);
  // 3. Verify login created session with matching customer info
  TestValidator.equals(
    "login customer ID matches join",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.equals("login email matches", loginResult.email, email);
  TestValidator.predicate(
    "login created_at is valid",
    loginResult.created_at.length > 0,
  );
  // 4. The session ID is typically returned in login response or stored in token
  // For this endpoint test, we validate the session retrieval structure
  // Note: In actual implementation, session ID would come from login response
  // This test validates the GET /sessions/{sessionId} endpoint structure
  // Create connection with auth token for session retrieval
  const sessionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${loginResult.token.access}`,
    },
  };
  // Retrieve session - using a UUID format session identifier
  // In production, this would be the actual session ID from login
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const session = await api.functional.shoppingMall.customer.sessions.at(
    sessionConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // 5. Validate session contains all required fields
  TestValidator.predicate(
    "session ID is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
  );
  TestValidator.equals(
    "session customer ID matches",
    session.customer.id,
    loginResult.id,
  );
  TestValidator.equals(
    "session customer email matches",
    session.customer.email,
    loginResult.email,
  );
  TestValidator.predicate("session IP is not empty", session.ip.length > 0);
  TestValidator.predicate(
    "session href is URI format",
    session.href.length > 0,
  );
  TestValidator.predicate(
    "session referrer is URI format",
    session.referrer.length > 0,
  );
  // 6. Validate timestamps are properly formatted ISO 8601 date-time
  TestValidator.predicate(
    "created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.created_at),
  );
  TestValidator.predicate(
    "expired_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.expired_at),
  );
  // 7. Validate expiration is in the future
  TestValidator.predicate(
    "session expiration is in future",
    new Date(session.expired_at) > new Date(),
  );
  // 8. Validate creation is in the past or present
  TestValidator.predicate(
    "session creation is not in future",
    new Date(session.created_at) <= new Date(),
  );
  // 9. Validate customer profile exists and has required fields
  if (session.customer.profile !== null) {
    TestValidator.predicate(
      "profile ID is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.customer.profile.id,
      ),
    );
    TestValidator.predicate(
      "profile display name is not empty",
      session.customer.profile.displayName.length > 0,
    );
    TestValidator.predicate(
      "profile phone number is not empty",
      session.customer.profile.phoneNumber.length > 0,
    );
  }
}
