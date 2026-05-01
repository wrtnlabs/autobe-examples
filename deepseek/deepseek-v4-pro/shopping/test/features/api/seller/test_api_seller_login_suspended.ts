import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a suspended seller can still log in to the platform.
 *
 * Verifies that suspension — which hides products from search and blocks new product creation — does not revoke authentication access. The seller must still be able to log in and receive valid JWT tokens for processing existing orders.
 *
 * The test validates that the login response includes `suspended_at` set to a non-null ISO 8601 timestamp, confirming the seller is suspended yet still authenticated. The `banned_at` field must remain null since suspension is distinct from banning. The returned token pair must be present and valid.
 *
 * 1. Administrator registers and authenticates via `authorize_admin_join`.
 * 2. Seller registers with explicit email and password for later login reuse.
 * 3. Administrator approves the pending seller registration.
 * 4. Administrator suspends the approved seller, setting `suspended_at`.
 * 5. Suspended seller attempts login — must succeed with 200 and valid tokens.
 * 6. Validates `suspended_at` is non-null, `banned_at` remains null, token pair is present.
 */
export async function test_api_seller_login_suspended(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Generate seller credentials for explicit reuse during login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // 3. Register and authenticate the seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(seller);
  // 4. Administrator approves the seller — transitions from "pending" to "approved"
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 5. Administrator suspends the approved seller — sets suspended_at timestamp
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(suspendedSeller);
  // 6. Attempt login as the suspended seller using a fresh connection
  const suspendedSellerConnection: api.IConnection = { host: connection.host };
  const suspendedLogin = await authorize_seller_login(
    suspendedSellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(suspendedLogin);
  // 7. Validate login response confirms suspended state with valid tokens
  TestValidator.equals("email matches", suspendedLogin.email, sellerEmail);
  TestValidator.equals(
    "approval status remains approved",
    suspendedLogin.approval_status,
    "approved",
  );
  TestValidator.predicate(
    "suspended_at is set to a non-null timestamp",
    suspendedLogin.suspended_at !== null,
  );
  TestValidator.equals(
    "banned_at remains null — suspension is distinct from banning",
    suspendedLogin.banned_at,
    null,
  );
  TestValidator.predicate(
    "access token is present and non-empty",
    suspendedLogin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present and non-empty",
    suspendedLogin.token.refresh.length > 0,
  );
}
