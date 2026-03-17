import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActor";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test administrator retrieving an active customer session for security auditing.
 *
 * This test validates that:
 * 1. Administrator can query customer sessions
 * 2. Response correctly resolves polymorphic actor reference
 * 3. Computed fields (is_expired, is_active) accurately reflect session state
 * 4. Session metadata (IP, href, referrer) properly captured
 */
export async function test_api_session_customer_active_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer account and session
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerHref = typia.random<string & tags.Format<"uri">>();
  const customerReferrer = typia.random<string & tags.Format<"uri">>();
  const customerIp = typia.random<string & tags.Format<"ipv4">>();
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: customerHref,
      referrer: customerReferrer,
      ip: customerIp,
    },
  });
  typia.assert(customerAuth);
  // Step 2: Extract session ID from JWT token claims
  // JWT token contains claims: sub (customer_id), type ("customer"), sid (session_id), iat, exp
  const tokenParts = customerAuth.token.access.split(".");
  const payload = JSON.parse(atob(tokenParts[1]));
  const sessionId = payload.sid as string;
  // Step 3: Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // Step 4: Query customer session as administrator
  const session = await api.functional.shoppingMall.customer.sessions.at(
    adminConnection,
    { sessionId },
  );
  typia.assert(session);
  // Step 5: Validate session response
  TestValidator.equals("session id", session.id, sessionId);
  TestValidator.equals("actor type", session.actor_type, "customer");
  TestValidator.predicate("is expired", session.is_expired === false);
  TestValidator.predicate("is active", session.is_active === true);
  // Validate actor reference (polymorphic type discriminator)
  if (session.actor.type === "customer") {
    TestValidator.equals("actor id", session.actor.id, customerAuth.id);
    TestValidator.equals(
      "actor email",
      session.actor.email,
      customerAuth.email,
    );
    TestValidator.equals(
      "actor display name",
      session.actor.displayName,
      customerAuth.displayName,
    );
  }
}
