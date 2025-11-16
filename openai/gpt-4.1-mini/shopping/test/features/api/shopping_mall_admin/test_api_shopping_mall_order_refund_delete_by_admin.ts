import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_shopping_mall_order_refund_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registers via the join operation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "P@ssw0rd123",
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Attempt to delete a shopping mall order refund by its ID
  const refundId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.shoppingMall.admin.shoppingMallOrderRefunds.erase(
    connection,
    { shoppingMallOrderRefundId: refundId },
  );
}
