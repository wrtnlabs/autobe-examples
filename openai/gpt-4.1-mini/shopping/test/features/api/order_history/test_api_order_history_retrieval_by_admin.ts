import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";

export async function test_api_order_history_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user signup and authentication via /auth/admin/join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "secretpassword",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);
  TestValidator.predicate(
    "admin token present",
    !!adminAuthorized.token.access,
  );

  // 2. Generate a random UUID for order history ID
  const orderHistoryId = typia.random<string & tags.Format<"uuid">>();

  // 3. Admin user retrieves order history by ID
  const orderHistory: IShoppingMallOrderHistory =
    await api.functional.shoppingMall.admin.orderHistories.at(connection, {
      id: orderHistoryId,
    });
  typia.assert(orderHistory);

  // 4. Validate retrieved order history fields for correctness and presence
  TestValidator.equals(
    "orderHistory.id matches",
    orderHistory.id,
    orderHistoryId,
  );
  TestValidator.predicate(
    "orderHistory.shopping_mall_order_id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      orderHistory.shopping_mall_order_id,
    ),
  );
  TestValidator.predicate(
    "order_status is string",
    typeof orderHistory.order_status === "string",
  );
  TestValidator.predicate(
    "payment_status is string",
    typeof orderHistory.payment_status === "string",
  );
  TestValidator.predicate(
    "shipment_status is string",
    typeof orderHistory.shipment_status === "string",
  );
  TestValidator.predicate(
    "total_amount is number",
    typeof orderHistory.total_amount === "number",
  );

  // 5. Attempt to retrieve order history without admin auth should fail
  // We simulate an unauthenticated connection by cloning and clearing headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access throws error", async () => {
    await api.functional.shoppingMall.admin.orderHistories.at(
      unauthenticatedConnection,
      {
        id: orderHistoryId,
      },
    );
  });
}
