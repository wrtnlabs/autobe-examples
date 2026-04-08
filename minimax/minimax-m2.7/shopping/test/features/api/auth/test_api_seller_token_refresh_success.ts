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
 * Test successful token refresh for an approved seller.
 *
 * Validates the complete token refresh flow for an approved seller account. First registers a new seller, then an administrator approves the seller account. After login to obtain initial tokens, this test verifies that the refresh endpoint successfully issues new access and refresh tokens while preserving seller account details.
 *
 * Key validation points include:
 * 1. Token rotation - new tokens differ from original tokens
 * 2. Seller details are preserved in the refresh response
 * 3. Approval status correctly shows 'approved' after admin approval
 * 4. The new refresh token can be used for subsequent refresh operations
 *
 * This test ensures the authentication system correctly maintains seller sessions through token refresh without requiring re-authentication.
 *
 * 1. Register new seller via POST /ecommerceMall/auth/seller/join
 * 2. Admin joins and logs in via POST /ecommerceMall/auth/admin/join and POST /ecommerceMall/auth/admin/login
 * 3. Admin approves seller via POST /ecommerceMall/admin/admin/sellers/{sellerId}/approve
 * 4. Seller logs in to get initial tokens via POST /ecommerceMall/auth/seller/login
 * 5. Call POST /ecommerceMall/auth/seller/refresh with initial refresh token
 * 6. Validate new tokens are different from original
 * 7. Validate seller details in response (id, email, approvalStatus)
 * 8. Perform second refresh to verify token chain works
 */
export async function test_api_seller_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await api.functional.ecommerceMall.auth.seller.join(
    connection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerJoinResult);
  // 2. Admin joins and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.ecommerceMall.auth.admin.join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const adminLoginResult = await api.functional.ecommerceMall.auth.admin.login(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  typia.assert(adminLoginResult);
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      {
        sellerId: sellerJoinResult.id,
      },
    );
  typia.assert(approvedSeller);
  TestValidator.equals(
    "approval status is approved",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 4. Seller logs in to get initial tokens
  const sellerLoginResult =
    await api.functional.ecommerceMall.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    });
  typia.assert(sellerLoginResult);
  const originalAccessToken = sellerLoginResult.token.access;
  const originalRefreshToken = sellerLoginResult.token.refresh;
  // 5. Call POST /ecommerceMall/auth/seller/refresh with the valid refresh token
  const refreshResult = await api.functional.ecommerceMall.auth.seller.refresh(
    connection,
    {
      body: {
        refresh: originalRefreshToken,
      } satisfies IEcommerceMallSeller.IRefresh,
    },
  );
  typia.assert(refreshResult);
  // 6. Validate new tokens are different from original
  TestValidator.notEquals(
    "new access token differs from original",
    refreshResult.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshResult.token.refresh,
    originalRefreshToken,
  );
  // 7. Validate seller details in response
  TestValidator.equals(
    "seller id preserved",
    refreshResult.id,
    sellerJoinResult.id,
  );
  TestValidator.equals(
    "seller email preserved",
    refreshResult.email,
    sellerEmail,
  );
  TestValidator.equals(
    "approval status is approved",
    refreshResult.approvalStatus,
    "approved",
  );
  // 8. Verify the new refresh token can be used for subsequent refresh operations
  const secondRefreshResult =
    await api.functional.ecommerceMall.auth.seller.refresh(connection, {
      body: {
        refresh: refreshResult.token.refresh,
      } satisfies IEcommerceMallSeller.IRefresh,
    });
  typia.assert(secondRefreshResult);
  // Verify second refresh also works and tokens are rotated again
  TestValidator.notEquals(
    "second refresh new access token differs",
    secondRefreshResult.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "second refresh new refresh token differs",
    secondRefreshResult.token.refresh,
    refreshResult.token.refresh,
  );
  TestValidator.equals(
    "seller id preserved after second refresh",
    secondRefreshResult.id,
    sellerJoinResult.id,
  );
  TestValidator.equals(
    "approval status is approved after second refresh",
    secondRefreshResult.approvalStatus,
    "approved",
  );
}
