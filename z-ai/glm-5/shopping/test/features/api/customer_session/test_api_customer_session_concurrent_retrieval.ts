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

export async function test_api_customer_session_concurrent_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Store password to reuse for both join and login
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  // Step 1: Customer joins the platform - creates first session
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAuth = await authorize_customer_join(firstConnection, {
    body: {
      email,
      password,
      displayName: RandomGenerator.name(),
      href: "https://shopping-mall.example.com/join",
      referrer: "https://shopping-mall.example.com",
    },
  });
  typia.assert(firstAuth);
  // Extract session ID from JWT access token (sid claim in payload)
  const firstTokenParts = firstAuth.token.access.split(".");
  const firstPayload = JSON.parse(
    Buffer.from(firstTokenParts[1], "base64url").toString("utf-8"),
  );
  const firstSessionId = firstPayload.sid as string & tags.Format<"uuid">;
  // Step 2: Customer logs in again - creates second concurrent session
  const secondConnection: api.IConnection = { host: connection.host };
  const secondAuth = await authorize_customer_login(secondConnection, {
    body: {
      email: firstAuth.email,
      password,
      href: "https://shopping-mall.example.com/login",
      referrer: "https://shopping-mall.example.com/home",
    },
  });
  typia.assert(secondAuth);
  // Extract session ID from second JWT access token
  const secondTokenParts = secondAuth.token.access.split(".");
  const secondPayload = JSON.parse(
    Buffer.from(secondTokenParts[1], "base64url").toString("utf-8"),
  );
  const secondSessionId = secondPayload.sid as string & tags.Format<"uuid">;
  // Step 3: Retrieve first session
  const firstSession = await api.functional.shoppingMall.customer.sessions.at(
    firstConnection,
    { sessionId: firstSessionId },
  );
  typia.assert(firstSession);
  // Step 4: Retrieve second session
  const secondSession = await api.functional.shoppingMall.customer.sessions.at(
    firstConnection,
    { sessionId: secondSessionId },
  );
  typia.assert(secondSession);
  // Step 5: Validate session properties
  // Both sessions have unique IDs
  TestValidator.notEquals(
    "session IDs are unique",
    firstSession.id,
    secondSession.id,
  );
  // Both sessions belong to the same customer
  TestValidator.equals(
    "same customer for both sessions",
    firstSession.customer.id,
    secondSession.customer.id,
  );
  TestValidator.equals(
    "same email for both sessions",
    firstSession.customer.email,
    secondSession.customer.email,
  );
  // Sessions have different created_at timestamps
  TestValidator.notEquals(
    "different creation timestamps",
    firstSession.created_at,
    secondSession.created_at,
  );
  // Validate retrieved session IDs match extracted IDs
  TestValidator.equals(
    "first session ID matches token",
    firstSession.id,
    firstSessionId,
  );
  TestValidator.equals(
    "second session ID matches token",
    secondSession.id,
    secondSessionId,
  );
}
