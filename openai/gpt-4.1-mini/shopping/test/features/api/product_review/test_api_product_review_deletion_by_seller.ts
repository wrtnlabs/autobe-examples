import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_product_review_deletion_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "strongPassword123!",
        store_name: RandomGenerator.name(2),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Seller login (to mutualize authentication)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "strongPassword123!",
      ip: null,
      href: "http://localhost/login",
      referrer: "http://localhost",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. Seller creates a product
  const productCreateBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    brand: RandomGenerator.name(1),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Seller creates a SKU variant for the product
  const skuCreateBody = {
    sku_code: `${product.code}-SKU1`,
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
    >(),
    attributes_json: JSON.stringify({ color: "red", size: "M" }),
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      { productCode: product.code, body: skuCreateBody },
    );
  typia.assert(sku);

  // 5. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customerStrongPass1$",
        nickname: RandomGenerator.name(2),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 6. Customer login
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customerStrongPass1$",
      ip: null,
      href: "http://localhost/login",
      referrer: "http://localhost",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 7. Customer places an order with the created SKU
  const orderBody = {
    order_code: `ORD-${RandomGenerator.alphaNumeric(8)}`,
    shipping_address: `123 ${RandomGenerator.name(2)} St, City, Country`,
    shopping_mall_order_items: [
      {
        shopping_mall_product_sku_id: sku.id,
        quantity: 1,
        unit_price: sku.price,
        total_price: sku.price,
      },
    ],
    shopping_mall_payments: [],
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 8. Customer writes a product review tied to the SKU and order
  const reviewCreateBody = {
    shopping_mall_product_sku_id: sku.id,
    shopping_mall_order_id: order.id,
    rating: 5,
    review_body: RandomGenerator.paragraph({ sentences: 3 }),
    moderation_status: "pending",
  } satisfies IShoppingMallProductReview.ICreate;

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.productReviews.create(
      connection,
      {
        body: reviewCreateBody,
      },
    );
  typia.assert(review);

  // 9. Seller deletes the product review by review ID
  await api.functional.shoppingMall.seller.productReviews.erase(connection, {
    id: review.id,
  });

  // 10. Verify that the review no longer exists by attempting to fetch or
  // asserting error on any fetching method (since no fetch operation listed,
  // we'll assert that fetching review causes error)
  await TestValidator.error("review deleted should not be found", async () => {
    // No explicit get/delete function for review in materials was given,
    // so simulate via re-deleting same ID (should error) or other
    // invalid operation
    await api.functional.shoppingMall.seller.productReviews.erase(connection, {
      id: review.id,
    });
  });
}
