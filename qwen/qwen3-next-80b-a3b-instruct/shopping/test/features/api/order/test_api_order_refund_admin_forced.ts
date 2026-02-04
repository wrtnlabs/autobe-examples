import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_refund_admin_forced(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super admin user
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/referral",
    },
  });
  typia.assert(superAdmin);
  // Step 2: Create a regular admin user (for testing access control)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/referral",
    },
  });
  typia.assert(admin);
  // Step 3: Create a customer user
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/referral",
    },
  });
  typia.assert(customer);
  // Step 4: Create a seller user
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(seller);
  // Step 5: Create a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    superAdminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
      },
    },
  );
  typia.assert(category);
  // Step 6: Create a product as seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.categoryId,
      },
    },
  );
  typia.assert(product);
  // Step 7: Create a customer order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // Step 8: Verify super admin can initiate forced refund
  // We are testing that a super admin can force refund an order item
  // The endpoint expects order.id and orderItemId
  // We don't have direct access to order items, but we can use the order ID
  // We'll create a new order and use its ID
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // Test successful refund by super admin
  await api.functional.shoppingMall.admin.admins.orders.items.refund(
    superAdminConnection,
    {
      orderId: order.id,
      orderItemId,
    },
  );
  // Step 9: Verify regular admin cannot initiate forced refund (access control)
  // We'll test that a regular admin gets 403 error
  await TestValidator.error(
    "regular admin should not be able to force refund",
    async () => {
      await api.functional.shoppingMall.admin.admins.orders.items.refund(
        adminConnection,
        {
          orderId: order.id,
          orderItemId,
        },
      );
    },
  );
  // Step 10: Verify customer cannot initiate forced refund (access control)
  await TestValidator.error(
    "customer should not be able to force refund",
    async () => {
      await api.functional.shoppingMall.admin.admins.orders.items.refund(
        customerConnection,
        {
          orderId: order.id,
          orderItemId,
        },
      );
    },
  );
  // Step 11: Verify seller cannot initiate forced refund (access control)
  await TestValidator.error(
    "seller should not be able to force refund",
    async () => {
      await api.functional.shoppingMall.admin.admins.orders.items.refund(
        sellerConnection,
        {
          orderId: order.id,
          orderItemId,
        },
      );
    },
  );
  // Step 12: Verify non-existent order fails
  await TestValidator.error("non-existent order should fail", async () => {
    await api.functional.shoppingMall.admin.admins.orders.items.refund(
      superAdminConnection,
      {
        orderId: "00000000-0000-0000-0000-000000000000", // Known non-existent UUID
        orderItemId: orderItemId,
      },
    );
  });
  // Step 13: Verify non-existent order item fails
  await TestValidator.error("non-existent order item should fail", async () => {
    await api.functional.shoppingMall.admin.admins.orders.items.refund(
      superAdminConnection,
      {
        orderId: order.id,
        orderItemId: "00000000-0000-0000-0000-000000000000", // Known non-existent UUID
      },
    );
  });
}