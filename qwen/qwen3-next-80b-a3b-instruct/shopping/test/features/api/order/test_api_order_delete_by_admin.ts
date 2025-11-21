import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

export async function test_api_order_delete_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminSecret123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Login as admin
  const adminConn: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.admin.login(adminConn, {
    body: {
      email: adminEmail,
      password_hash: "adminSecret123",
    } satisfies IShoppingMallAdmin.IRequest,
  });

  // Step 3: Generate a valid order number for deletion
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const sequence = String(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<99999>
    >(),
  ).padStart(5, "0");
  const orderNumber = `ORD-${year}${month}${day}-${sequence}`;

  // Step 4: Delete the order using admin permissions
  await api.functional.shoppingMall.admin.orders.erase(adminConn, {
    orderNumber,
  });

  // The deletion is successful if no error is thrown
  // The function returns void, so we're done.
}
