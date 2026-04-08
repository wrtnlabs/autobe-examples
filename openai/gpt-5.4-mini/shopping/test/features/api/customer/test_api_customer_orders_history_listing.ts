import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_orders_history_listing(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer order history listing with pagination and summary-only fields.
   *
   * Validates that an authenticated customer can browse only their own order history in a paginated summary form. The test ensures the response respects page and limit parameters, returns the authenticated customer's own records, and exposes only the browsing-friendly fields needed for history listing.
   *
   * 1. Register a customer account and authenticate using a dedicated customer connection.
   * 2. Request the customer's order history using explicit pagination values and verify pagination metadata.
   * 3. Confirm each returned entry belongs to the signed-in customer and contains summary fields such as order number, created time, total amount, and status.
   * 4. Verify the default ordering behavior is newest-first by checking timestamps are in descending order when multiple records exist.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const firstPage = await api.functional.mallPlatform.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IMallPlatformOrder.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "requested page should be reflected in pagination current",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit should be reflected in pagination limit",
    firstPage.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination record count should match returned data length when fewer records than the page size exist",
    firstPage.pagination.records >= firstPage.data.length,
    true,
  );
  TestValidator.predicate(
    "pagination pages count should be non-negative",
    () => firstPage.pagination.pages >= 0,
  );
  for (const order of firstPage.data) {
    TestValidator.equals(
      "order history should be scoped to the signed-in customer",
      order.customer.id,
      authorized.id,
    );
    TestValidator.equals(
      "order history customer email should match signed-in customer",
      order.customer.email,
      authorized.email,
    );
  }
  if (firstPage.data.length >= 2) {
    for (let index = 1; index < firstPage.data.length; index++) {
      TestValidator.predicate(
        "order history should be sorted newest first by createdAt",
        () =>
          new Date(firstPage.data[index - 1].createdAt).getTime() >=
          new Date(firstPage.data[index].createdAt).getTime(),
      );
    }
  }
  const secondPage = await api.functional.mallPlatform.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IMallPlatformOrder.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "second request should reflect requested page",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second request should reflect requested limit",
    secondPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "summary listing should not expose full order item details",
    () =>
      firstPage.data.every(
        (order) =>
          !("items" in order) &&
          !("orderItems" in order) &&
          !("shipments" in order),
      ),
  );
  TestValidator.predicate(
    "summary listing should expose mandatory browsing fields",
    () =>
      firstPage.data.every(
        (order) =>
          typeof order.id === "string" &&
          typeof order.orderNumber === "string" &&
          typeof order.status === "string" &&
          typeof order.totalAmount === "number" &&
          typeof order.createdAt === "string" &&
          typeof order.updatedAt === "string",
      ),
  );
}
