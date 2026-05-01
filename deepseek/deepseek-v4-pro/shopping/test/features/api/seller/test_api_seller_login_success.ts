import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller login with valid credentials after registration.
 *
 * Validates that a newly registered seller can authenticate using their email and password. The test first registers a seller account via join, then attempts login with the same credentials to verify the authentication flow works end-to-end.
 *
 * Special attention is given to verifying the seller's approval status is "pending" for new accounts, the profile fields are null since the seller has not yet configured their shop, and a valid JWT token pair is issued for session management.
 *
 * 1. Register a seller account with random email and password.
 * 2. Login with the same email and password credentials.
 * 3. Validate the authenticated response contains correct identity, pending approval status, null profile fields, and valid token pair.
 * 4. Confirm the session token is set on the connection for subsequent API requests.
 */
export async function test_api_seller_login_success(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(joinConnection, {
    body: { email, password },
  });
  const loginConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(seller);
  TestValidator.equals("email matches", seller.email, email);
  TestValidator.equals(
    "approval status is pending",
    seller.approval_status,
    "pending",
  );
  TestValidator.equals("shop name is null", seller.profile.shop_name, null);
  TestValidator.equals(
    "shop description is null",
    seller.profile.shop_description,
    null,
  );
  TestValidator.equals(
    "logo image uri is null",
    seller.profile.logo_image_uri,
    null,
  );
  TestValidator.predicate(
    "access token is non-empty",
    seller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    seller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "session token set on connection",
    loginConnection.headers?.Authorization === seller.token.access,
  );
}
