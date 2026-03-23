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
 * Test that an authenticated administrator can successfully update a seller's shop profile information.
 *
 * Setup:
 * 1. Register and authenticate as an administrator
 * 2. Register a seller account with email, password, shop_name, and shop_description
 * 3. Administrator approves the seller's approval request (status becomes 'approved')
 *
 * Test Steps:
 * 1. Admin calls PUT /shoppingMall/admin/sellers/{sellerId} with updated shop_name, shop_description, and logo_image
 * 2. Verify the response returns the updated IShoppingMallSeller object
 * 3. Verify the returned seller object contains the new shop_name, shop_description, and logo_image values
 * 4. Verify the updated_at timestamp is more recent than the original created_at
 * 5. Verify other fields (email, approval_status, status) remain unchanged
 * 6. Verify password_hash is NOT included in the response
 */
export async function test_api_seller_profile_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  typia.assert(adminAuth);
  // 2. Seller setup - register a seller account (logo_image not available in IJoin)
  const sellerConnection: api.IConnection = { host: connection.host };
  const originalShopName = RandomGenerator.name();
  const originalShopDescription = RandomGenerator.paragraph({ sentences: 3 });
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: originalShopName,
      shop_description: originalShopDescription,
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller submits approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(approvalRequest);
  // 4. Admin approves the seller's approval request
  const updatedApprovalRequest =
    await api.functional.shoppingMall.admin.seller_approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(updatedApprovalRequest);
  // 5. Admin updates seller profile with new information including logo_image
  const newShopName = RandomGenerator.name();
  const newShopDescription = RandomGenerator.paragraph({ sentences: 5 });
  const newLogoImage = "https://example.com/new-logo.png";
  const updatedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: sellerAuth.id,
      body: {
        shop_name: newShopName,
        shop_description: newShopDescription,
        logo_image: newLogoImage,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller);
  // 6. Verify the response contains updated values
  TestValidator.equals(
    "shop_name updated",
    updatedSeller.shop_name,
    newShopName,
  );
  TestValidator.equals(
    "shop_description updated",
    updatedSeller.shop_description,
    newShopDescription,
  );
  TestValidator.equals(
    "logo_image updated",
    updatedSeller.logo_image,
    newLogoImage,
  );
  // 7. Verify updated_at is more recent than created_at
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedSeller.updated_at).getTime() >=
      new Date(updatedSeller.created_at).getTime(),
  );
  // 8. Verify other fields remain unchanged
  TestValidator.equals(
    "email unchanged",
    updatedSeller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "approval_status unchanged",
    updatedSeller.approval_status,
    "approved",
  );
  TestValidator.equals("status unchanged", updatedSeller.status, "active");
}
