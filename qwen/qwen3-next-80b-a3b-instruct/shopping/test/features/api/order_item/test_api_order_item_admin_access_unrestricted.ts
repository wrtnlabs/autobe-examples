import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_admin_access_unrestricted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and store email and password
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminUser);
  // 2. Create customer account and store email and password
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerUser = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerUser);
  // 3. Log in as admin to get authorized connection
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail, // Use stored email, not adminUser.email
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 4. Generate a random order item that matches the schema
  const mockOrderItem: IShoppingMallOrderItem =
    typia.random<IShoppingMallOrderItem>();
  // 5. Admin accesses the order item (unrestricted access)
  const orderItem = await api.functional.shoppingMall.customer.orders.items.at(
    adminLoginConnection,
    {
      orderId: mockOrderItem.orderId,
      itemId: mockOrderItem.orderId, // Since there's no 'id' property, use orderId as itemId
    },
  );
  typia.assert(orderItem);
  // 6. Validate unrestricted admin access - admin can view any order item
  TestValidator.equals(
    "admin can access order item",
    orderItem.orderId,
    mockOrderItem.orderId,
  );
  TestValidator.equals(
    "admin can access order item",
    orderItem.sellerId,
    mockOrderItem.sellerId,
  );
  TestValidator.equals(
    "admin can access order item",
    orderItem.productId,
    mockOrderItem.productId,
  );
  TestValidator.equals(
    "admin can access order item",
    orderItem.variantId,
    mockOrderItem.variantId,
  );
  TestValidator.equals(
    "admin can access order item",
    orderItem.productSnapshotId,
    mockOrderItem.productSnapshotId,
  );
  TestValidator.equals(
    "admin can access order item",
    orderItem.variantSnapshotId,
    mockOrderItem.variantSnapshotId,
  );
  TestValidator.equals(
    "admin can access order item",
    orderItem.priceAtTimeOfPurchase,
    mockOrderItem.priceAtTimeOfPurchase,
  );
  TestValidator.equals(
    "admin can access order item",
    orderItem.quantity,
    mockOrderItem.quantity,
  );
  TestValidator.equals(
    "admin can access order item",
    orderItem.status,
    mockOrderItem.status,
  );
  TestValidator.equals(
    "admin can access order item",
    orderItem.product.name,
    mockOrderItem.product.name,
  );
  TestValidator.equals(
    "admin can access order item",
    orderItem.variant.sku_code,
    mockOrderItem.variant.sku_code,
  );
  TestValidator.equals(
    "admin can access order item",
    orderItem.variant.price,
    mockOrderItem.variant.price,
  );
  TestValidator.equals(
    "admin can access order item",
    orderItem.variant.stock_quantity,
    mockOrderItem.variant.stock_quantity,
  );
}
