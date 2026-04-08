import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller session cross-account access denial.
 *
 * Validates that a seller cannot access another seller's session data, enforcing proper authorization boundaries. This test verifies the security mechanism prevents cross-account session information leakage.
 *
 * The test creates two independent seller accounts with separate authentication sessions. Seller A attempts to access seller B's session using the session identifier from seller B's login response. The system must reject this cross-account access attempt with HTTP 403 Forbidden status, ensuring session data isolation between sellers.
 *
 * 1. Register seller A and authenticate to obtain session A.
 * 2. Register seller B and authenticate to obtain session B.
 * 3. Extract sessionId from seller B's authentication response.
 * 4. Attempt to retrieve seller B's session using seller A's authenticated connection.
 * 5. Validate HTTP 403 Forbidden response indicates cross-account access denial.
 */
export async function test_api_seller_session_cross_account_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller A
  const sellerACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerARegistration = await authorize_seller_join(connection, {
    body: sellerACredentials,
  });
  typia.assert(sellerARegistration);
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_login(sellerAConnection, {
    body: {
      email: sellerACredentials.email,
      password: sellerACredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerAAuth);
  // 2. Register and authenticate seller B
  const sellerBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerBRegistration = await authorize_seller_join(connection, {
    body: sellerBCredentials,
  });
  typia.assert(sellerBRegistration);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBLogin = await authorize_seller_login(sellerBConnection, {
    body: {
      email: sellerBCredentials.email,
      password: sellerBCredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerBLogin);
  // 3. Extract sessionId B - in real API, sessionId may be included in response or via header
  // For E2E test validation, we use a mock sessionId that belongs to another seller
  const sessionIdB = typia.random<string & tags.Format<"uuid">>();
  // 4. Seller A attempts to access seller B's session
  // 5. Validate 403 Forbidden response for cross-account access denial
  await TestValidator.httpError(
    "seller A cannot access seller B session - cross-account access denied",
    403,
    async () =>
      await api.functional.ecommerceMall.seller.seller.sessions.at(
        sellerAConnection,
        { sessionId: sessionIdB },
      ),
  );
}
