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

export async function test_api_order_item_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registers via join
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "securePassword123!",
        store_name: RandomGenerator.name(2),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Seller creates a product
  const productCode: string = RandomGenerator.alphaNumeric(10);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);
  TestValidator.equals("product code matches", product.code, productCode);

  // 3. Seller creates a SKU variant for product
  const skuCode: string = RandomGenerator.alphaNumeric(8);
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: {
          sku_code: skuCode,
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1> &
              tags.Maximum<100000>
          >(),
          attributes_json: JSON.stringify({ color: "red", size: "M" }),
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(sku);
  TestValidator.equals("sku code matches", sku.sku_code, skuCode);

  // 4. Customer joins
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "anotherSecurePass456$",
        nickname: RandomGenerator.name(2),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Customer creates an order with the SKU
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        order_code: RandomGenerator.alphaNumeric(12),
        shipping_address: `${RandomGenerator.name(1)} Street, Apt 101, City, Country`,
        shopping_mall_order_items: [
          {
            shopping_mall_product_sku_id: sku.id,
            quantity: 2,
            unit_price: sku.price,
            total_price: sku.price * 2,
          },
        ],
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);
  TestValidator.equals(
    "order address matches",
    typeof order.shipping_address,
    "string",
  );

  // 6. Seller logs in to ensure session switch
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "securePassword123!",
      ip: null,
      href: "http://localhost/login",
      referrer: "http://localhost",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 7. Seller adds an order item to existing order
  const orderItemRequestBody = {
    shopping_mall_product_sku_id: sku.id,
    quantity: 1,
    unit_price: sku.price,
    total_price: sku.price,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.seller.orders.items.create(connection, {
      orderCode: order.order_code,
      body: orderItemRequestBody,
    });
  typia.assert(orderItem);

  // 8. Verify the created order item
  TestValidator.equals(
    "order item sku id matches",
    orderItem.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals("order item quantity matches", orderItem.quantity, 1);
  TestValidator.equals(
    "order item unit price matches",
    orderItem.unit_price,
    sku.price,
  );
  TestValidator.equals(
    "order item total price matches",
    orderItem.total_price,
    sku.price,
  );
}
