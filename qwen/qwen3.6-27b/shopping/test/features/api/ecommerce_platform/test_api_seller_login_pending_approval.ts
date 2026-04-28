import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
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
 * Test that a seller with pending approval status can successfully authenticate.
 *
 * Validates that a newly registered seller account with 'pending' approval status
 * can log in using email and password credentials. Upon registration, sellers receive
 * pending approval status but are able to authenticate and receive JWT tokens.
 *
 * 1. Register a new seller account with random credentials.
 * 2. Validate registration response has 'pending' approval_status.
 * 3. Create a fresh connection and login with the registered credentials.
 * 4. Validate login succeeds and returns IAuthorized with JWT tokens.
 * 5. Confirm approval_status remains 'pending' in the authorization response.
 */
export async function test_api_seller_login_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller with pending status
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const joinBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformSeller.IJoin;
  const joined = await authorize_seller_join(sellerJoinConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  // Validate registration response
  TestValidator.equals(
    "approval_status is pending after join",
    joined.approval_status,
    "pending",
  );
  TestValidator.equals("is not banned", joined.is_banned, false);
  // 2. Create fresh connection for login
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformSeller.ILogin;
  const loggedIn = await authorize_seller_login(sellerLoginConnection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  // 3. Validate login response for pending approval seller
  TestValidator.equals(
    "login approval_status is pending",
    loggedIn.approval_status,
    "pending",
  );
  TestValidator.equals(
    "rejection_reason is null for pending",
    loggedIn.rejection_reason,
    null,
  );
  TestValidator.equals("login email matches", loggedIn.email, sellerEmail);
  TestValidator.equals("is not banned", loggedIn.is_banned, false);
  TestValidator.predicate("login granted access token", () => {
    return loggedIn.token.access.length > 0;
  });
  TestValidator.predicate("login granted refresh token", () => {
    return loggedIn.token.refresh.length > 0;
  });
  TestValidator.predicate("access token differs from join", () => {
    return loggedIn.token.access !== joined.token.access;
  });
  TestValidator.equals(
    "shop name null for new seller",
    loggedIn.shop_name,
    null,
  );
  TestValidator.equals(
    "shop description null for new seller",
    loggedIn.shop_description,
    null,
  );
}
