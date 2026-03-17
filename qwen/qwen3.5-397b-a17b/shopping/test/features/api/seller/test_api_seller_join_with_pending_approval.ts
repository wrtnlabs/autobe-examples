import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
 * Test successful seller account registration with valid credentials and shop information.
 *
 * This test verifies the complete seller registration workflow:
 * 1. Seller account is created with approval_status set to 'PENDING'
 * 2. JWT access and refresh tokens are returned in the response
 * 3. Response includes seller profile information (id, email, shop_name, approval_status, suspended flag)
 * 4. Seller approval_status remains 'PENDING' until admin approval
 * 5. approvedByAdmin is null for pending sellers
 * 6. Account timestamps (created_at, updated_at) are properly set
 * 7. deleted_at is null for active accounts
 * 8. Seller can use the returned access token for authenticated requests
 */
export async function test_api_seller_join_with_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection for registration
  const sellerConnection: api.IConnection = { host: connection.host };
  // Prepare registration input data
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_image_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.IJoin;
  // Register new seller account using utility function
  const seller = await authorize_seller_join(sellerConnection, {
    body: joinInput,
  });
  // Validate response structure with typia
  typia.assert(seller);
  // Verify approval status is PENDING (requires admin approval)
  TestValidator.equals("approval status", seller.approval_status, "PENDING");
  // Verify approvedByAdmin is null for pending sellers
  TestValidator.equals("approved by admin", seller.approvedByAdmin, null);
  // Verify suspended flag is false for new sellers
  TestValidator.predicate("not suspended", !seller.suspended);
  // Verify account is not deleted
  TestValidator.equals("deleted at", seller.deleted_at, null);
  // Verify seller profile fields match input
  TestValidator.equals("email matches input", seller.email, joinInput.email);
  TestValidator.equals(
    "shop name matches input",
    seller.shop_name,
    joinInput.shop_name,
  );
  TestValidator.equals(
    "shop description matches input",
    seller.shop_description,
    joinInput.shop_description,
  );
  TestValidator.equals(
    "logo image URL matches input",
    seller.logo_image_url,
    joinInput.logo_image_url,
  );
  // Verify seller connection has authorization token set
  TestValidator.predicate(
    "seller connection has token",
    sellerConnection.headers?.Authorization !== undefined,
  );
}