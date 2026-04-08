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
 * Test token refresh with an expired/invalid refresh token.
 *
 * Validates that the system properly rejects expired or invalid refresh tokens when attempting to obtain new authentication tokens. This is a critical security test that ensures unauthorized users cannot use stolen or expired tokens to maintain session access.
 *
 * The test flow:
 * 1. Creates an administrator account for approval operations.
 * 2. Registers a new seller account which starts in pending status.
 * 3. Administrator approves the seller, changing status to approved.
 * 4. Seller logs in to obtain valid access and refresh tokens.
 * 5. Attempts to refresh tokens using an invalid/expired refresh token.
 * 6. Expects 401 Unauthorized response with appropriate error message.
 *
 * Security validation: Expired refresh tokens must be rejected to prevent session hijacking and unauthorized access.
 */
export async function test_api_seller_token_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/register" as string &
        tags.Format<"uri">,
      referrer: "https://example.com" as string & tags.Format<"uri">,
    },
  });
  typia.assert(sellerJoin);
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: sellerJoin.id },
    );
  typia.assert(approvedSeller);
  // 4. Login as approved seller to get valid tokens
  const loggedInSeller = await api.functional.ecommerceMall.auth.seller.login(
    sellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: "https://example.com/seller/login" as string & tags.Format<"uri">,
        referrer: "https://example.com" as string & tags.Format<"uri">,
      },
    },
  );
  typia.assert(loggedInSeller);
  // Store the valid refresh token
  const validRefreshToken = loggedInSeller.token.refresh;
  // 5. Try to refresh with an invalid/expired refresh token
  // Using a deliberately invalid token to simulate expired token
  const invalidRefreshToken = "invalid.expired.token.string";
  // 6. Verify that the refresh with invalid token returns 401 Unauthorized
  await TestValidator.httpError(
    "expired refresh token should return 401",
    401,
    async () => {
      await api.functional.ecommerceMall.auth.seller.refresh(sellerConnection, {
        body: {
          refresh: invalidRefreshToken,
        },
      });
    },
  );
}
