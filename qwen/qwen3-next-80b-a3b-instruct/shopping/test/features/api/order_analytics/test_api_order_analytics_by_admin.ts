import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_analytics_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminHref = "https://example.com/admin/join";
  const adminReferrer = "https://example.com";
  // Create admin connection and authenticate using the provided utility
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create minimal analytics request
  // The IRequest type contains optional fields for filtering
  const analyticsRequest: IShoppingMallOrder.IRequest = {};
  // Step 3: Call analytics endpoint
  const analyticsResult: IPageIShoppingMallOrder =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      { body: analyticsRequest },
    );
  // Step 4: Validate response structure
  // The response must have pagination and data
  TestValidator.equals(
    "pagination exists",
    analyticsResult.pagination !== undefined,
    true,
  );
  TestValidator.equals("data exists", analyticsResult.data !== undefined, true);
  // Validate pagination structure
  TestValidator.equals("pagination current >= 1", analyticsResult.pagination.current >= 1, true);
  TestValidator.equals("pagination limit > 0", analyticsResult.pagination.limit > 0, true);
  TestValidator.equals("pagination records >= 0", analyticsResult.pagination.records >= 0, true);
  TestValidator.equals("pagination pages >= 0", analyticsResult.pagination.pages >= 0, true);
  // Validate data is an array
  TestValidator.equals("data is array", Array.isArray(analyticsResult.data), true);
  // Step 5: Validate that unauthorized access is forbidden
  // We cannot create customer or seller accounts because no API functions exist
  // To test unauthorized access, we must try with a non-admin connection
  // Since we cannot create a customer connection, we use the base connection without auth
  // This simulates an unauthenticated request
  // Try to access analytics with unauthenticated connection
  await TestValidator.error(
    "unauthenticated user should not access analytics",
    async () => {
      await api.functional.shoppingMall.admin.analytics.orders.index(
        connection, // base connection without auth
        { body: analyticsRequest },
      );
    },
  );
  // Create another connection without admin auth to simulate unauthorized access
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Use unauthorized connection for test
  await TestValidator.error(
    "unauthorized user should not access analytics",
    async () => {
      await api.functional.shoppingMall.admin.analytics.orders.index(
        unauthorizedConnection, // no auth
        { body: analyticsRequest },
      );
    },
  );
}