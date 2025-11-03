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

export async function test_api_order_item_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer account
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const createdCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "P@ssw0rd123",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(createdCustomer);

  // 2. Register a new seller account
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const createdSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "P@ssw0rd123",
        store_name: `Store-${RandomGenerator.name(1)}`,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(createdSeller);

  // 3. Seller login to switch authorization
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "P@ssw0rd123",
      ip: null,
      href: "https://test.example.com/login",
      referrer: "https://test.example.com/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 4. Seller creates a product
  const productCode = `code-${RandomGenerator.alphaNumeric(8)}`;
  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        brand: "TestBrand",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(createdProduct);
  TestValidator.equals(
    "created product code equals",
    createdProduct.code,
    productCode,
  );

  // 5. Seller creates a SKU for the product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(10)}`;
  const createdSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: {
          sku_code: skuCode,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
          attributes_json: JSON.stringify({ color: "red", size: "M" }),
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(createdSku);
  TestValidator.equals("created sku code equals", createdSku.sku_code, skuCode);

  // 6. Customer login to switch authorization for order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "P@ssw0rd123",
      ip: null,
      href: "https://test.example.com/login",
      referrer: "https://test.example.com/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 7. Customer creates an order
  const orderCode = `order-${RandomGenerator.alphaNumeric(8)}`;
  const createdOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        order_code: orderCode,
        shipping_address: "123 Test Street, Seoul, South Korea",
        shopping_mall_order_items: [],
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(createdOrder);
  TestValidator.equals(
    "created order code equals",
    createdOrder.order_code,
    orderCode,
  );

  // 8. Customer adds an order item to the created order
  const quantity = 2;
  const unitPrice = createdSku.price;
  const totalPrice = quantity * unitPrice;
  const createdOrderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.orders.items.create(connection, {
      orderCode: orderCode,
      body: {
        shopping_mall_product_sku_id: createdSku.id,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      } satisfies IShoppingMallOrderItem.ICreate,
    });
  typia.assert(createdOrderItem);
  TestValidator.equals(
    "order item SKU id matched",
    createdOrderItem.shopping_mall_product_sku_id,
    createdSku.id,
  );
  TestValidator.equals(
    "order item quantity matched",
    createdOrderItem.quantity,
    quantity,
  );
  TestValidator.equals(
    "order item unit price matched",
    createdOrderItem.unit_price,
    unitPrice,
  );
  TestValidator.equals(
    "order item total price matched",
    createdOrderItem.total_price,
    totalPrice,
  );
}
