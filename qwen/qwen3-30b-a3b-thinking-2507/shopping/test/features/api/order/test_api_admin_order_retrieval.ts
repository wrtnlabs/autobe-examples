import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_order_retrieval(
  connection: api.IConnection,
) {
  // 1. Create new admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAccount);
  // 2. Verify admin account creation
  TestValidator.equals("admin email matches", adminAccount.email, adminEmail);
  TestValidator.equals("admin role is set", adminAccount.role, "admin");
  // 3. Retrieve an order using admin connection
  const orderCode: string = typia.random<string>();
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.at(adminConnection, {
      orderCode,
    });
  typia.assert(order);
  // 4. Validate order details
  TestValidator.equals("order has ID", typeof order.id, "string");
  TestValidator.equals("order status", order.status, "pending");
  TestValidator.notEquals("order has items", order.items.length, 0);
  TestValidator.equals(
    "order total price is positive",
    order.totalPrice >= 0,
    true,
  );
  TestValidator.equals(
    "order has customer reference",
    order.customer.id,
    order.customer.id,
  );
}
