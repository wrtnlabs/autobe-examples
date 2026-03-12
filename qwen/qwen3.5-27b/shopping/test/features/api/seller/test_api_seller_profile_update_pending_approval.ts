import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
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
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test that an administrator can update a seller's profile even when the seller's approval_status is 'pending'.
 *
 * Setup:
 * 1. Register and authenticate as an administrator
 * 2. Register a seller account with email, password, shop_name, shop_description, and logo_image
 * 3. Seller submits an approval request (status remains 'pending')
 * 4. Do NOT approve the seller request - leave it in pending state
 *
 * Test Steps:
 * 1. Admin calls PUT /shoppingMall/admin/sellers/{sellerId} with updated shop_name and shop_description
 * 2. Verify the response returns HTTP 200 with the updated IShoppingMallSeller object
 * 3. Verify the returned seller object contains the new shop_name and shop_description values
 * 4. Verify approval_status remains 'pending' (not changed by profile update)
 * 5. Verify status remains 'active'
 * 6. Verify updated_at timestamp is more recent than created_at
 */
export async function test_api_seller_profile_update_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  // 2. Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const initialShopName = RandomGenerator.name();
  const initialShopDescription = RandomGenerator.paragraph({ sentences: 2 });
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "1234",
      shop_name: initialShopName,
      shop_description: initialShopDescription,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  const logoImageUrl = sellerAuth.logo_image;
  // 3. Seller submits approval request (status remains 'pending')
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(approvalRequest);
  // Verify seller is in pending state
  TestValidator.equals(
    "seller approval_status is pending",
    sellerAuth.approval_status,
    "pending",
  );
  TestValidator.equals("seller status is active", sellerAuth.status, "active");
  // 4. Admin updates seller profile while pending
  const updatedShopName = RandomGenerator.name() + " Updated";
  const updatedShopDescription =
    RandomGenerator.paragraph({ sentences: 3 }) + " - Updated Description";
  const updatedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: sellerId,
      body: {
        shop_name: updatedShopName,
        shop_description: updatedShopDescription,
      },
    },
  );
  typia.assert(updatedSeller);
  // 5. Verify the updated seller profile
  TestValidator.equals(
    "shop_name updated",
    updatedSeller.shop_name,
    updatedShopName,
  );
  TestValidator.equals(
    "shop_description updated",
    updatedSeller.shop_description,
    updatedShopDescription,
  );
  TestValidator.equals(
    "approval_status remains pending",
    updatedSeller.approval_status,
    "pending",
  );
  TestValidator.equals("status remains active", updatedSeller.status, "active");
  TestValidator.equals(
    "logo_image preserved",
    updatedSeller.logo_image,
    logoImageUrl,
  );
  // 6. Verify updated_at is more recent than created_at
  const updatedAt = new Date(updatedSeller.updated_at);
  const createdAt = new Date(updatedSeller.created_at);
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedAt >= createdAt,
  );
}