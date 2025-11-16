import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_shopping_mall_admin_order_item_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(8);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: adminPassword,
        phone_number: RandomGenerator.mobile(),
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Seller user registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(8);
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        name: RandomGenerator.name(),
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Create product by seller
  const productCode = RandomGenerator.alphaNumeric(10).toUpperCase();
  const productName = RandomGenerator.name();
  const productDescription = RandomGenerator.content({ paragraphs: 1 });
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: {
          code: productCode,
          name: productName,
          description: productDescription,
          is_active: true,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);

  // 4. Customer user registration and authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(8);
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        full_name: RandomGenerator.name(),
        href: "https://example.com/signup",
        referrer: "https://google.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 5. Create shopping mall order by customer
  const orderNumber = RandomGenerator.alphaNumeric(12).toUpperCase();
  const orderStatus = "pending";
  const paymentStatus = "pending";
  const totalAmount = 100;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      {
        body: {
          order_number: orderNumber,
          status: orderStatus,
          payment_status: paymentStatus,
          total_amount: totalAmount,
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
  typia.assert(order);

  // 6. Create order item by customer for the order
  const quantity = 1;
  const unitPrice = 100;
  const orderItemStatus = "pending";
  const orderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.createOrderItem(
      connection,
      {
        orderId: order.id,
        body: {
          product_sku_id: typia.random<string & tags.Format<"uuid">>(), // Using random UUID to simulate SKU
          quantity: quantity,
          unit_price: unitPrice,
          status: orderItemStatus,
        } satisfies IShoppingMallOrderItem.ICreate,
      },
    );
  typia.assert(orderItem);

  // 7. Retrieve order item details as admin
  const fetchedOrderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.shoppingMallOrders.orderItems.at(
      connection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
      },
    );
  typia.assert(fetchedOrderItem);

  // 8. Validate order item data integrity
  TestValidator.equals(
    "order item id matches",
    fetchedOrderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "order id matches",
    fetchedOrderItem.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "unit price matches",
    fetchedOrderItem.unit_price,
    unitPrice,
  );
  TestValidator.equals("quantity matches", fetchedOrderItem.quantity, quantity);
  TestValidator.equals(
    "status matches",
    fetchedOrderItem.status,
    orderItemStatus,
  );
  TestValidator.predicate(
    "created_at is valid iso date",
    typeof fetchedOrderItem.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(fetchedOrderItem.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid iso date",
    typeof fetchedOrderItem.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(fetchedOrderItem.updated_at),
  );
}
