import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller login when the account is suspended but not banned.
 *
 * Validates that a suspended seller account can still authenticate successfully and receive proper authorization tokens, while the suspension status is correctly reflected in the response. This test ensures that suspension restricts product management capabilities but does not prevent the seller from logging in to process existing orders.
 *
 * The test follows the complete workflow: administrator registration, seller registration, seller approval, seller suspension, and finally seller login verification. Special attention is given to confirming that the suspended flag is true while banned remains false in the authorization response.
 *
 * 1. Register and authenticate an administrator account.
 * 2. Register a new seller account with random credentials.
 * 3. Approve the seller account using administrator privileges.
 * 4. Suspend the approved seller account.
 * 5. Attempt to log in as the suspended seller.
 * 6. Verify the login succeeds and returns IShoppingMallSeller.IAuthorized with suspended=true and banned=false.
 * 7. Validate all seller profile fields are present in the response.
 * 8. Confirm the token object contains valid access and refresh tokens.
 */
export async function test_api_seller_login_suspended_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: undefined,
  });
  typia.assert(adminAuthorized);
  // 2. Register a new seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // 3. Approve the seller account
  const approvedSeller =
    await api.functional.shoppingMall.administrator.sellers.approve(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          approval_reason: "Test approval for suspended login test",
        } satisfies IShoppingMallSeller.IApprove,
      },
    );
  typia.assert(approvedSeller);
  // 4. Suspend the seller account
  const suspendedProfile =
    await api.functional.shoppingMall.administrator.sellers.suspend(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          suspended: true,
        } satisfies IShoppingMallSeller.ISuspendRequest,
      },
    );
  typia.assert(suspendedProfile);
  // 5. Log in as the suspended seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ILogin;
  const loggedInSeller = await authorize_seller_login(sellerLoginConnection, {
    body: loginBody,
  });
  typia.assert(loggedInSeller);
  // 6. Verify the login succeeded with correct suspension status
  TestValidator.equals("seller ID matches", loggedInSeller.id, sellerId);
  TestValidator.equals("email matches", loggedInSeller.email, sellerEmail);
  TestValidator.equals(
    "approval status is approved",
    loggedInSeller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "suspended flag is true",
    loggedInSeller.suspended,
    true,
  );
  TestValidator.equals("banned flag is false", loggedInSeller.banned, false);
  // 7. Verify seller profile fields are present
  TestValidator.predicate(
    "shop name is non-empty",
    loggedInSeller.shop_name.length > 0,
  );
  TestValidator.predicate(
    "shop description is non-empty",
    loggedInSeller.shop_description.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^[\d T:\.Z-]+$/.test(loggedInSeller.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^[\d T:\.Z-]+$/.test(loggedInSeller.updated_at),
  );
  // 8. Verify token object contains valid tokens
  TestValidator.predicate(
    "access token is non-empty",
    loggedInSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loggedInSeller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^[\d T:\.Z-]+$/.test(loggedInSeller.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^[\d T:\.Z-]+$/.test(loggedInSeller.token.refreshable_until),
  );
}
