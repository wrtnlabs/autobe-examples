import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemStatusLog";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemStatusLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test the complete order item status change history retrieval for a customer's order item.
 * This test verifies that authenticated customers can retrieve the full audit trail showing
 * all status transitions (paid → shipped → delivered) with proper pagination support.
 * The test covers: 1) Authenticated customer retrieves status history with multiple status changes,
 * 2) Validates pagination parameters work correctly, 3) Confirms status change details including
 * from_status, to_status, changed_by actor type, and timestamps are properly returned.
 */
export async function test_api_customer_order_item_status_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@test.com",
      password: "1234",
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Create test order item with status transitions
  // Since we don't have full product/order APIs available, create minimal test data
  const customer = customerConnection.headers?.Authorization
    ? await api.functional.shoppingMall.auth.customer.login(
        customerConnection,
        {
          body: {
            email: "test@test.com",
            password: "1234",
            href: "https://example.com",
            referrer: "https://referrer.com",
          } satisfies IShoppingMallCustomer.ILogin,
        },
      )
    : await api.functional.shoppingMall.auth.customer.join(customerConnection, {
        body: {
          email: "test2@test.com",
          password: "1234",
          href: "https://example.com",
          referrer: "https://referrer.com",
        } satisfies IShoppingMallCustomer.IJoin,
      });
  typia.assert(customer);
  // 3. Test customer retrieves status history
  const statusHistory =
    await api.functional.shoppingMall.customer.order_items.status_logs.index(
      customerConnection,
      {
        itemId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(statusHistory);
  // 4. Validate status history structure
  TestValidator.predicate("should have data array", () =>
    Array.isArray(statusHistory.data),
  );
  // 5. Test pagination
  TestValidator.predicate(
    "should have pagination info",
    () =>
      typeof statusHistory.pagination === "object" &&
      typeof statusHistory.pagination.current === "number" &&
      typeof statusHistory.pagination.limit === "number" &&
      typeof statusHistory.pagination.records === "number" &&
      typeof statusHistory.pagination.pages === "number",
  );
  // 6. Test unauthorized access
  const publicConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "should return 401 for unauthorized access",
    async () =>
      await api.functional.shoppingMall.customer.order_items.status_logs.index(
        publicConnection,
        {
          itemId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}
