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

export async function test_api_session_detail_active_session(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Customer registration - creates session with tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://shopping-mall.example.com/join",
      referrer: "https://shopping-mall.example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResponse);
  // Step 2: Get session ID from token response
  // The session ID is returned alongside the authorization token
  // Access it from the extended response that includes sessionId
  const sessionId = joinResponse.token.access.split(".")[0] as string &
    tags.Format<"uuid">;
  // Alternative: Session ID might be embedded in the response
  // For now, use the token's session reference if available
  const responseWithSession =
    joinResponse as IShoppingMallCustomer.IAuthorized & {
      sessionId?: string & tags.Format<"uuid">;
    };
  const actualSessionId = responseWithSession.sessionId ?? sessionId;
  // Step 3: Retrieve session details using authenticated connection
  const session = await api.functional.shoppingMall.customer.sessions.at(
    customerConnection,
    {
      sessionId: actualSessionId,
    },
  );
  typia.assert(session);
  // Step 4: Validate session response structure
  TestValidator.equals("session ID matches", session.id, actualSessionId);
  TestValidator.equals(
    "customer ID matches",
    session.customer.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "customer email matches",
    session.customer.email,
    joinResponse.email,
  );
  // Step 5: Validate session metadata was captured during join
  TestValidator.predicate("has IP address", session.ip.length > 0);
  TestValidator.predicate("has href", session.href !== null);
  TestValidator.predicate("has referrer", session.referrer !== null);
  TestValidator.predicate("has user agent", session.userAgent !== null);
  // Step 6: Validate timestamps
  TestValidator.predicate(
    "createdAt is valid ISO 8601",
    !isNaN(new Date(session.createdAt).getTime()),
  );
  TestValidator.predicate(
    "expiredAt is valid ISO 8601",
    !isNaN(new Date(session.expiredAt).getTime()),
  );
  TestValidator.predicate(
    "expiredAt is in the future",
    new Date(session.expiredAt).getTime() > Date.now(),
  );
  // Step 7: Validate computed validity field (active session)
  TestValidator.equals(
    "session validity is true for active session",
    session.validity,
    true,
  );
  // Step 8: Security validation - tokens must NOT be in session response
  const sessionObj = session as Record<string, unknown>;
  TestValidator.predicate(
    "no access_token in response",
    !("access_token" in sessionObj) && !("accessToken" in sessionObj),
  );
  TestValidator.predicate(
    "no refresh_token in response",
    !("refresh_token" in sessionObj) && !("refreshToken" in sessionObj),
  );
  TestValidator.predicate(
    "no token object in response",
    !("token" in sessionObj),
  );
  // Step 9: Validate customer summary structure
  TestValidator.equals(
    "customer summary has correct displayName",
    session.customer.displayName,
    joinResponse.displayName,
  );
  TestValidator.equals(
    "customer summary has correct phoneNumber",
    session.customer.phoneNumber,
    joinResponse.phoneNumber,
  );
  TestValidator.predicate(
    "customer has isDeleted flag",
    typeof session.customer.isDeleted === "boolean",
  );
  TestValidator.equals(
    "customer isDeleted is false for active account",
    session.customer.isDeleted,
    false,
  );
}
