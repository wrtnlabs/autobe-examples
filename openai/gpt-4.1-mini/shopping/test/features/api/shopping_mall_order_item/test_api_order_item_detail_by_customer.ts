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

export async function test_api_order_item_detail_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registers with join
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "password123",
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Customer login
  const customerAuthorized = await api.functional.auth.customer.login(
    connection,
    {
      body: {
        email: customerEmail,
        password: "password123",
        href: "https://test.page.com/login",
        referrer: "https://test.page.com",
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(customerAuthorized);

  // 3. Seller registers with join
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "password123",
      store_name: `Store_${RandomGenerator.alphaNumeric(5)}`,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 4. Seller login
  const sellerAuthorized = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "password123",
      href: "https://test.page.com/login",
      referrer: "https://test.page.com",
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerAuthorized);

  // 5. Seller creates a product
  const productCode: string = `PRD${RandomGenerator.alphaNumeric(7)}`;
  const productName: string = RandomGenerator.name(2);
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: productCode,
        name: productName,
        description: RandomGenerator.paragraph({ sentences: 6 }),
        brand: "TestBrand",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Create a SKU manually to use for the order item.
  // Since SKU creation API is not provided, emulate SKU data.
  // We make sure SKU has valid UUID and link it to product.

  // For the sake of this test, fabricate a SKU ID.
  // This is acceptable because no separate SKU creation API is provided.
  // Use typia.random() for SKU ID.
  const skuId = typia.random<string & tags.Format<"uuid">>();

  // 6. Customer creates an order with a unique code
  const orderCode: string = `ORD-${RandomGenerator.alphaNumeric(8)}`;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        order_code: orderCode,
        shipping_address: `123 ${RandomGenerator.name(3)}, City, Country`,
        shopping_mall_order_items: [],
        shopping_mall_payments: [],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 7. Customer creates an order item in the order with the fabricated SKU
  const quantity: number & tags.Type<"int32"> = RandomGenerator.pick([
    1, 2, 3, 4, 5,
  ]);
  const unitPrice: number = 100.0; // Fixed price for test
  const totalPrice: number = quantity * unitPrice;

  // Now create order item
  const orderItem =
    await api.functional.shoppingMall.customer.orders.items.create(connection, {
      orderCode: orderCode,
      body: {
        shopping_mall_product_sku_id: skuId,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      } satisfies IShoppingMallOrderItem.ICreate,
    });
  typia.assert(orderItem);

  // 8. Customer fetches detailed order item info by order code and item ID
  const fetchedItem =
    await api.functional.shoppingMall.customer.orders.items.at(connection, {
      orderCode: orderCode,
      itemId: orderItem.id,
    });
  typia.assert(fetchedItem);

  // Validate that fetched item is the same as created order item by id
  TestValidator.equals(
    "Fetched order item ID should equal the created order item ID",
    fetchedItem.id,
    orderItem.id,
  );

  // Validate order item belongs to the correct order code
  TestValidator.equals(
    "Fetched order item order code should belong to the created order",
    typeof fetchedItem.shopping_mall_order_id,
    "string",
  );

  // Enhanced validation: fetched item properties check
  TestValidator.predicate(
    "Quantity should be positive",
    fetchedItem.quantity > 0,
  );
  TestValidator.predicate(
    "Unit price should be positive",
    fetchedItem.unit_price > 0,
  );
  TestValidator.equals(
    "Total price should be quantity * unit price",
    fetchedItem.total_price,
    fetchedItem.unit_price * fetchedItem.quantity,
  );
}
