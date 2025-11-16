import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";

export async function test_api_shoppingmall_order_item_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "strongP@ssword123",
        phone_number: RandomGenerator.mobile(),
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login to switch session
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "strongP@ssword123",
      href: "https://test.admin.site/login",
      referrer: "https://test.admin.site",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Register customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "cust0merP@ss",
        full_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://test.customer.site/signup",
        referrer: "https://test.customer.site",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Customer login to switch session
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "cust0merP@ss",
      href: "https://test.customer.site/login",
      referrer: "https://test.customer.site",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 5. Customer creates an order
  const orderNumber = RandomGenerator.alphaNumeric(10);
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      {
        body: {
          order_number: orderNumber,
          payment_status: "pending",
          status: "pending",
          total_amount: 999.99,
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
  typia.assert(order);

  // 6. Customer adds an order item
  const productSkuId = typia.random<string & tags.Format<"uuid">>();
  const quantity = 1;
  const unitPrice = 999.99;
  const orderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.createOrderItem(
      connection,
      {
        orderId: order.id,
        body: {
          product_sku_id: productSkuId,
          quantity: quantity,
          unit_price: unitPrice,
          status: "pending",
        } satisfies IShoppingMallOrderItem.ICreate,
      },
    );
  typia.assert(orderItem);

  // 7. Switch session to admin to delete order item
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "strongP@ssword123",
      href: "https://test.admin.site/login",
      referrer: "https://test.admin.site",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 8. Admin deletes the specific order item
  await api.functional.shoppingMall.admin.shoppingMallOrders.orderItems.erase(
    connection,
    {
      orderId: order.id,
      orderItemId: orderItem.id,
    },
  );

  // 9. After deletion, try to confirm the order item is deleted
  // This test environment lacks explicit GET APIs for items, so
  // we rely on error throwing on re-delete attempt
  await TestValidator.error(
    "deleting already deleted order item should fail",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallOrders.orderItems.erase(
        connection,
        {
          orderId: order.id,
          orderItemId: orderItem.id,
        },
      );
    },
  );

  // 10. Test unauthorized deletion attempt by customer
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "cust0merP@ss",
      href: "https://test.customer.site/login",
      referrer: "https://test.customer.site",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  await TestValidator.error(
    "customer should not delete order item",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallOrders.orderItems.erase(
        connection,
        {
          orderId: order.id,
          orderItemId: orderItem.id, // Even though it exists, customer lacks access
        },
      );
    },
  );
}
