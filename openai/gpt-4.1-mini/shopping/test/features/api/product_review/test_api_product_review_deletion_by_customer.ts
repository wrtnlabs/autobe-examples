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

export async function test_api_product_review_deletion_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "StrongPass123!",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Customer login
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "StrongPass123!",
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 3. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "StrongPass123!",
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 4. Seller login
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "StrongPass123!",
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 5. Create product
  const productCreateBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    brand: RandomGenerator.name(1),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Create SKU variant for the product
  const skuCreateBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    price: 10000,
    attributes_json: JSON.stringify({
      color: RandomGenerator.pick(["red", "green", "blue"] as const),
      size: RandomGenerator.pick(["S", "M", "L"] as const),
    }),
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 7. Switch back to customer login to place order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "StrongPass123!",
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 8. Place an order by the customer with the SKU
  const orderCreateBody = {
    order_code: `ORD-${RandomGenerator.alphaNumeric(8)}`,
    shipping_address: "123 Test St, Seoul, Korea",
    shopping_mall_order_items: [
      {
        shopping_mall_product_sku_id: sku.id,
        quantity: 1,
        unit_price: sku.price,
        total_price: sku.price,
      },
    ],
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 9. Create a product review by the customer
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

  // 10. Delete the product review by ID
  await api.functional.shoppingMall.customer.productReviews.erase(connection, {
    id: review.id,
  });

  // 11. Verify the review is deleted by asserting error on fetching deleted review
  await TestValidator.error("Should fail to fetch deleted review", async () => {
    // Try fetching the deleted review via a GET operation. Since such an operation
    // is not given in the provided APIs, we expect this to error if it existed.
    // The scenario requires checking that fetching deleted review fails with not found error.
    // Due to lack of GET API, this is a placeholder to illustrate the error test.
    // This step is simulated by calling erase again (since no get exists) to trigger error.
    await api.functional.shoppingMall.customer.productReviews.erase(
      connection,
      {
        id: review.id,
      },
    );
  });
}
