import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";

export async function test_api_product_review_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "P@ssw0rd123",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Seller joins and authenticates
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "P@ssw0rd123",
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    brand: RandomGenerator.name(1),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Validate product has at least one SKU to reference
  TestValidator.predicate(
    "product has valid SKUs",
    product.shopping_mall_product_skus !== undefined &&
      product.shopping_mall_product_skus.length !== 0,
  );

  // Pick first SKU
  const sku: IShoppingMallProductSku = product.shopping_mall_product_skus![0];

  // 4. Customer joins and authenticates
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "P@ssw0rd123",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Customer creates an order with one order item for the SKU
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_product_sku_id: sku.id,
    quantity: 1,
    unit_price: sku.price ?? 10000,
    total_price: sku.price ?? 10000,
  };
  const orderCreateBody: IShoppingMallOrder.ICreate = {
    order_code: `ORD${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    shipping_address: `${RandomGenerator.name()}, 123 Test St, Seoul, Korea`,
    shopping_mall_order_items: [orderItemCreate],
  };
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 6. Customer creates a product review
  const productReviewCreateBody: IShoppingMallProductReview.ICreate = {
    shopping_mall_product_sku_id: sku.id,
    shopping_mall_order_id: order.id,
    rating: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    review_body: RandomGenerator.paragraph({ sentences: 6 }),
    moderation_status: "pending",
  };
  const productReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.productReviews.create(
      connection,
      {
        body: productReviewCreateBody,
      },
    );
  typia.assert(productReview);

  // 7. Admin updates the product review with new rating, review body, and status
  const updatedReviewBody: IShoppingMallProductReview.IUpdate = {
    rating: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    review_body: RandomGenerator.paragraph({ sentences: 8 }),
    moderation_status: "approved",
  };

  const updatedReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.admin.productReviews.update(connection, {
      id: productReview.id,
      body: updatedReviewBody,
    });
  typia.assert(updatedReview);

  // 8. Validate that the updated review matches the updates
  TestValidator.equals(
    "rating updated correctly",
    updatedReview.rating,
    updatedReviewBody.rating,
  );
  TestValidator.equals(
    "review body updated correctly",
    updatedReview.review_body,
    updatedReviewBody.review_body,
  );
  TestValidator.equals(
    "moderation status updated correctly",
    updatedReview.moderation_status,
    updatedReviewBody.moderation_status,
  );
}
