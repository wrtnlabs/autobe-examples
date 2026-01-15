import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderStatusAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusAnalytics";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_status_analytics_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate with join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/signup",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminData },
  );
  typia.assert(admin);
  // Step 2: Retrieve order status analytics with admin connection
  const analytics: IShoppingMallOrderStatusAnalytics =
    await api.functional.shoppingMall.admin.analytics.orders.status.index(
      adminConnection,
    );
  typia.assert(analytics);
  // Step 3: Validate all order status fields have non-negative values (business logic)
  TestValidator.equals(
    "pending count is non-negative",
    analytics.pending >= 0,
    true,
  );
  TestValidator.equals(
    "processing count is non-negative",
    analytics.processing >= 0,
    true,
  );
  TestValidator.equals(
    "shipped count is non-negative",
    analytics.shipped >= 0,
    true,
  );
  TestValidator.equals(
    "delivered count is non-negative",
    analytics.delivered >= 0,
    true,
  );
  TestValidator.equals(
    "cancelled count is non-negative",
    analytics.cancelled >= 0,
    true,
  );
  TestValidator.equals(
    "returned count is non-negative",
    analytics.returned >= 0,
    true,
  );
  // Step 4: Create unauthenticated connection to verify non-admin access fails
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 5: Verify non-admin access throws permission error
  await TestValidator.error("non-admin access should be denied", async () => {
    await api.functional.shoppingMall.admin.analytics.orders.status.index(
      guestConnection,
    );
  });
}
