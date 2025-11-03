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

export async function test_api_product_review_creation_by_customer(
  connection: api.IConnection,
) {
  // Multi-actor authentication: Seller join and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "Abcd1234!",
        store_name: "Store - " + RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "Abcd1234!",
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(10);
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: productName,
        description: RandomGenerator.content({ paragraphs: 1 }),
        brand: "Brand" + RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Customer join
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "P@ssword1",
        nickname: RandomGenerator.name(2),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Customer login
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "P@ssword1",
      ip: null,
      href: "https://shopping.example.com/login",
      referrer: "https://shopping.example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Create an order for the customer, including purchase of a SKU
  if (
    !product.shopping_mall_product_skus ||
    product.shopping_mall_product_skus.length === 0
  ) {
    throw new Error("Product has no SKUs to order");
  }
  const sku: IShoppingMallProductSku = product.shopping_mall_product_skus[0];

  const orderCode = "ORD-" + RandomGenerator.alphaNumeric(8);

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        order_code: orderCode,
        shipping_address: "123 Test Street, Test City",
        shopping_mall_order_items: [
          {
            shopping_mall_product_sku_id: sku.id,
            quantity: 1,
            unit_price: sku.price,
            total_price: sku.price,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        shopping_mall_payments: [
          {
            shopping_mall_order_id: "", // this field is usually ignored in create schema
            payment_method: "credit_card",
            payment_status: "completed",
            payment_amount: sku.price,
            payment_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } satisfies IShoppingMallPayment.ICreate,
        ],
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // Create a product review linked to SKU and order for the customer
  const rating = RandomGenerator.pick([
    1, 2, 3, 4, 5,
  ] as const) satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const reviewBody =
    RandomGenerator.paragraph({ sentences: 4 }) + " - Detailed product review.";

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.productReviews.create(
      connection,
      {
        body: {
          shopping_mall_product_sku_id: sku.id,
          shopping_mall_order_id: order.id,
          rating: rating,
          review_body: reviewBody,
          moderation_status: "pending",
        } satisfies IShoppingMallProductReview.ICreate,
      },
    );
  typia.assert(review);

  // Basic business validations
  TestValidator.equals(
    "review linked to the correct SKU",
    review.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "review linked to the correct order",
    review.shopping_mall_order_id,
    order.id,
  );
  TestValidator.predicate(
    "rating is in range 1-5",
    review.rating >= 1 && review.rating <= 5,
  );
  TestValidator.equals(
    "moderation status is pending",
    review.moderation_status,
    "pending",
  );
  TestValidator.equals(
    "review body matches input",
    review.review_body,
    reviewBody,
  );
}
