import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
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

export async function test_api_customer_session_metadata_accuracy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account with known credentials for testing
  const knownEmail = typia.random<string & tags.Format<"email">>();
  const knownPassword = "TestPassword123!";
  const knownIp = "192.168.1.50";
  const knownHref = "https://shop.example.com/products";
  const knownReferrer = "https://google.com/search?q=shop";
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: knownEmail,
      password: knownPassword,
      href: knownHref,
      referrer: knownReferrer,
      ip: knownIp,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Login with the known credentials to create session with metadata
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email: knownEmail,
      password: knownPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResult);
  // 3. List sessions to obtain sessionId
  const sessionsPage =
    await api.functional.shoppingMall.customer.sessions.index(loginConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCustomerSession.IRequest,
    });
  typia.assert(sessionsPage);
  TestValidator.predicate(
    "has at least one session",
    () => sessionsPage.data.length > 0,
  );
  const sessionSummary = sessionsPage.data[0];
  const sessionId = sessionSummary.id;
  // 4. Retrieve specific session details
  const sessionDetails = await api.functional.shoppingMall.customer.sessions.at(
    loginConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(sessionDetails);
  // 5. Validate session metadata accuracy
  TestValidator.equals(
    "IP address matches login metadata",
    sessionDetails.ip,
    knownIp,
  );
  TestValidator.equals(
    "href matches login metadata",
    sessionDetails.href,
    knownHref,
  );
  TestValidator.equals(
    "referrer matches login metadata",
    sessionDetails.referrer,
    knownReferrer,
  );
  // Validate timestamps
  const createdAt = new Date(sessionDetails.created_at);
  const expiredAt = new Date(sessionDetails.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "created_at is in the past or now",
    () => createdAt <= now,
  );
  TestValidator.predicate("expired_at is in the future", () => expiredAt > now);
  TestValidator.predicate(
    "expired_at is after created_at",
    () => expiredAt > createdAt,
  );
  // 6. Verify session tokens are NOT exposed (security check)
  // The IShoppingMallCustomerSession type should not have token fields exposed
  const sessionKeys = Object.keys(sessionDetails);
  TestValidator.predicate(
    "no access_token in response",
    () => !sessionKeys.includes("access_token"),
  );
  TestValidator.predicate(
    "no refresh_token in response",
    () => !sessionKeys.includes("refresh_token"),
  );
  TestValidator.predicate(
    "no token field in response",
    () => !sessionKeys.includes("token"),
  );
}
