import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerBehaviorAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerBehaviorAnalytics";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_customer_behavior_analytics_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using the prescribed utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join-" + RandomGenerator.alphaNumeric(6),
      referrer:
        "https://example.com/admin/signup-" + RandomGenerator.alphaNumeric(6),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Call the customer behavior analytics endpoint using the authenticated admin connection
  const analytics: IShoppingMallCustomerBehaviorAnalytics =
    await api.functional.shoppingMall.admin.analytics.customers.behavior.index(
      adminConnection,
    );
  // Validate the response structure and type safety using typia.assert()
  typia.assert(analytics);
}
