import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the primary success path for seller registration on the shopping mall platform.
 *
 * Validates that when a seller provides valid registration credentials (unique email, valid password, href, referrer), the system creates a new seller account with pending approval status. The test verifies that the password is securely handled by the backend (hashed with BCrypt), JWT access and refresh tokens are generated correctly, and a session record is created with IP and request metadata.
 *
 * The test confirms that the IAuthorized response contains the complete seller identity with approval_status='pending', approval_reason=null, rejection_reason=null, suspended=false, and banned=false. Additionally, it validates that the authentication tokens (access, refresh) and their expiration timestamps are present and properly formatted.
 *
 * 1. Create a seller-specific connection from the base connection.
 * 2. Register a new seller with valid credentials using the authorize_seller_join utility function.
 * 3. Validate that the response is a properly typed IShoppingMallSeller.IAuthorized object.
 * 4. Verify that the seller account has pending approval status.
 * 5. Confirm that account status flags (suspended, banned) are false.
 * 6. Validate that approval_reason and rejection_reason are null for pending sellers.
 * 7. Verify that shop profile information (shop_name, shop_description) is present.
 * 8. Confirm that authentication tokens (access, refresh) and expiration timestamps are valid.
 */
export async function test_api_seller_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register new seller with valid credentials
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Validate seller account has pending approval status
  TestValidator.equals(
    "approval status is pending",
    seller.approval_status,
    "pending",
  );
  // 4. Verify account is not suspended or banned
  TestValidator.predicate(
    "seller is not suspended",
    seller.suspended === false,
  );
  TestValidator.predicate("seller is not banned", seller.banned === false);
  // 5. Confirm approval/rejection reasons are null for pending sellers
  TestValidator.equals("approval reason is null", seller.approval_reason, null);
  TestValidator.equals(
    "rejection reason is null",
    seller.rejection_reason,
    null,
  );
  // 6. Validate shop profile information exists
  TestValidator.predicate("shop name is present", seller.shop_name.length > 0);
  TestValidator.predicate(
    "shop description is present",
    seller.shop_description.length > 0,
  );
  // 7. Verify authentication tokens are present
  TestValidator.predicate(
    "access token is present",
    seller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    seller.token.refresh.length > 0,
  );
  // 8. Validate token expiration timestamps exist
  TestValidator.predicate(
    "access token expiration is valid",
    new Date(seller.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "refresh token expiration is valid",
    new Date(seller.token.refreshable_until).getTime() > 0,
  );
}
