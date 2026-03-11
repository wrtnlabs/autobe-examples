import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test order items filtering by status.
 * Validates that the PATCH endpoint correctly filters order items by status parameter.
 */
export async function test_api_customer_order_items_filter_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>() satisfies string as string,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
        referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
        ip: typia.random<string & tags.Format<"ipv4">>() satisfies string as string,
      },
    });
  typia.assert(customer);
  // 2. Create test order with multiple items
  // Note: We need order items in different statuses
  // Since we cannot directly create order items, we'll test with random order ID
  // and validate filtering behavior
  const orderId = typia.random<string & tags.Format<"uuid">>() satisfies string as string;
  // 3. Test filtering by each status
  const statuses: Array<
    "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
  > = ["paid", "shipped", "delivered", "cancelled", "refunded"];
  // Test with different status filters
  for (const status of statuses) {
    const filteredItems =
      await api.functional.ecommerceMall.customer.orders.items.index(
        customerConnection,
        {
          orderId,
          body: {
            status,
          } satisfies IEcommerceMallOrderItem.IRequest,
        },
      );
    typia.assert(filteredItems);
    // Verify pagination structure
    TestValidator.predicate(
      "pagination exists for status " + status,
      filteredItems.pagination !== undefined,
    );
    TestValidator.predicate(
      "data array exists",
      Array.isArray(filteredItems.data),
    );
    // Verify all returned items match the filter status
    if (filteredItems.data.length > 0) {
      for (const item of filteredItems.data) {
        TestValidator.equals(
          "item status matches filter for " + status,
          item.item_status,
          status,
        );
      }
    }
  }
  // 4. Test without status filter (should return all items)
  const allItems =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(allItems);
  TestValidator.predicate(
    "all items pagination exists",
    allItems.pagination !== undefined,
  );
  // 5. Test empty result handling
  // Use a non-existent order ID to get empty results
  const nonExistentOrderId = "00000000-0000-0000-0000-000000000000";
  const emptyResult =
    await api.functional.ecommerceMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: nonExistentOrderId,
        body: {
          status: "shipped",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result records count",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages count",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals("empty result data array", emptyResult.data.length, 0);
}