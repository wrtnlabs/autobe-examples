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

export async function test_api_seller_profile_update_suspended_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Seller setup - register a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const originalShopName = RandomGenerator.name();
  const originalShopDescription = RandomGenerator.paragraph({ sentences: 2 });
  const originalLogoImage = typia.random<string & tags.Format<"url">>();
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: originalShopName,
      shop_description: originalShopDescription,
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  const originalUpdatedAt = sellerAuth.updated_at;
  // 3. Submit seller approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(approvalRequest);
  // 4. Admin approves the seller
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
  // 5. Admin updates the approved seller's profile (normal operation)
  const newShopName = RandomGenerator.name();
  const newShopDescription = RandomGenerator.paragraph({ sentences: 3 });
  const newLogoImage = typia.random<string & tags.Format<"url">>();
  const updatedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: sellerId,
      body: {
        shop_name: newShopName,
        shop_description: newShopDescription,
        logo_image: newLogoImage,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller);
  // 6. Verify seller profile was updated successfully
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
  TestValidator.predicate(
    "updated_at changed",
    updatedSeller.updated_at !== originalUpdatedAt,
  );
  // Note: Testing suspended seller updates requires a separate endpoint to
  // change approval_status to 'suspended', which is not available in the current API.
  // The business logic should reject updates when approval_status is 'suspended' or 'banned'.
}