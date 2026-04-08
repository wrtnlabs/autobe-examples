import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test token refresh when seller account has been deleted.
 *
 * Validates that a deleted seller account cannot refresh tokens even if a valid
 * refresh token exists from before the account deletion. This ensures security
 * for deactivated accounts by rejecting token refresh attempts for soft-deleted
 * sellers.
 *
 * The test creates an admin to approve a new seller registration, logs in as
 * the seller to obtain valid tokens, deletes the seller account, and then
 * attempts to refresh the token using the previously obtained refresh token.
 *
 * 1. Administrator joins and authenticates to approve sellers.
 * 2. New seller registers and receives pending approval status.
 * 3. Admin approves the seller, changing status to approved.
 * 4. Seller logs in and receives valid access and refresh tokens.
 * 5. Seller deletes their own account (soft delete).
 * 6. Attempt to refresh tokens using the old refresh token.
 * 7. Verify 401 error with message indicating account is no longer active.
 */
export async function test_api_seller_token_refresh_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Register new seller with known credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    sellerJoinConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 3. Admin approves the seller
  const approved =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: seller.id },
    );
  typia.assert(approved);
  // 4. Seller logs in to get valid tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_seller_login(loginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(loggedIn);
  const refreshToken = loggedIn.token.refresh;
  // 5. Seller deletes their account
  await api.functional.ecommerceMall.seller.seller.account.erase(
    loginConnection,
  );
  // 6. Attempt to refresh token with the old refresh token
  // 7. Verify 401 error
  await TestValidator.error("refresh fails for deleted account", async () => {
    await api.functional.ecommerceMall.auth.seller.refresh(
      { host: connection.host },
      {
        body: { refresh: refreshToken } satisfies IEcommerceMallSeller.IRefresh,
      },
    );
  });
}
