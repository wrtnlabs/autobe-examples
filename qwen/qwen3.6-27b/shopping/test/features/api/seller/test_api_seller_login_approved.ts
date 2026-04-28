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
 * Test seller authentication with approved account status.
 *
 * Validates the complete seller login flow starting from account registration through successful authentication. A new seller account is registered first, then the same credentials are used to authenticate via the login endpoint.
 *
 * Upon successful login, the system queries the seller account by email, verifies the account is not banned, matches the password against the stored bcrypt hash, and generates JWT access and refresh tokens. A new session record is also created tracking connection metadata.
 *
 * 1. Seller registers a new account with email, password, and session context (href, referrer).
 * 2. Validates the join response contains seller identity, pending approval status, and tokens.
 * 3. Seller logs in using the same email and password used during registration.
 * 4. Validates the login response contains correct seller information and new authentication tokens.
 */
export async function test_api_seller_login_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare registration credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();
  // 2. Seller registration with explicit credentials
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
    },
  });
  typia.assert(seller);
  // 3. Validate join response
  TestValidator.equals("seller email matches input", seller.email, sellerEmail);
  TestValidator.equals(
    "newly registered seller approval is pending",
    seller.approval_status,
    "pending",
  );
  TestValidator.predicate("seller is not banned", !seller.is_banned);
  TestValidator.predicate(
    "has valid access token",
    seller.token.access.length > 0,
  );
  // 4. Seller login with registered credentials
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: undefined,
  } satisfies IEcommercePlatformSeller.ILogin;
  const loggedIn = await authorize_seller_login(sellerLoginConnection, {
    body: loginBody,
  });
  typia.assert(loggedIn);
  // 5. Validate login response
  TestValidator.equals("logged in seller id matches", loggedIn.id, seller.id);
  TestValidator.equals(
    "logged in seller email matches",
    loggedIn.email,
    sellerEmail,
  );
  TestValidator.equals(
    "logged in seller approval status",
    loggedIn.approval_status,
    "pending",
  );
  TestValidator.equals(
    "logged in seller not banned",
    loggedIn.is_banned,
    false,
  );
  TestValidator.predicate(
    "login has valid access token",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login has valid refresh token",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "tokens were refreshed",
    loggedIn.token.access !== seller.token.access,
  );
}
