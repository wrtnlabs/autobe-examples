import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerApprovalRequest";
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
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_update_full_update_with_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup (join also authenticates the connection with auth token)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Seller setup (creates account with 'pending' approval status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 3. Find the seller's pending approval request using the already-authenticated admin connection
  const approvalRequestPage =
    await api.functional.eCommerceMall.administrator.approval_requests.index(
      adminConnection,
      {
        body: {
          search: sellerEmail,
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IECommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(approvalRequestPage);
  const approvalRequest = approvalRequestPage.data[0];
  typia.assert(approvalRequest);
  // 4. Approve the seller
  const approvedRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Seller login with fresh connection (after approval)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuthorized = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerLoginAuthorized);
  // 6. Create original product with specific values
  const originalName = "Original Name";
  const originalDescription = "Original description";
  const originalBasePrice = 100.0;
  const originalProduct =
    await generate_random_e_commerce_mall_seller_products_create(
      sellerLoginConnection,
      {
        body: {
          name: originalName,
          description: originalDescription,
          base_price: originalBasePrice,
          category_id: null,
        } satisfies DeepPartial<IECommerceMallProduct.ICreate>,
      },
    );
  typia.assert(originalProduct);
  // 7. Update the product with new values
  const updatedName = "Updated Name";
  const updatedDescription = "Updated description";
  const updatedBasePrice = 150.0;
  const updatedProduct =
    await api.functional.eCommerceMall.seller.products.update(
      sellerLoginConnection,
      {
        productId: originalProduct.id,
        body: {
          name: updatedName,
          description: updatedDescription,
          base_price: updatedBasePrice,
        } satisfies IECommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 8. Verification: updated values should match
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    updatedName,
  );
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    updatedDescription,
  );
  TestValidator.equals(
    "product base price updated",
    updatedProduct.base_price,
    updatedBasePrice,
  );
  // 9. Verification: seller reference remains unchanged
  TestValidator.equals(
    "seller unchanged",
    updatedProduct.seller.id,
    originalProduct.seller.id,
  );
  // 10. Verification: updated_at is refreshed
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedProduct.updated_at,
    originalProduct.updated_at,
  );
}
