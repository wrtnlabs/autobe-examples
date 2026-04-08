import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test listing item-level contents for a customer-scoped order detail view.
 *
 * Verifies that an authenticated customer can request the order-item list endpoint with a valid request body and receive a paginated response made of order-item summaries. The test focuses on response shape, pagination metadata, and nested summary consistency so the payload is suitable for detail-screen rendering.
 *
 * 1. Register and authenticate a customer account.
 * 2. Call the customer order-items listing endpoint with a UUID-shaped order identifier and a standard pagination request.
 * 3. Validate the paginated response structure and nested summaries.
 * 4. Confirm the response items are internally consistent for a single order context.
 */
export async function test_api_customer_order_items_list_own_order(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/customer/orders",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformOrderItem.IRequest;
  const output =
    await api.functional.mallPlatform.customer.orders.orderItems.index(
      customerConnection,
      {
        orderId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "order items response uses the requested page",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "order items response uses the requested page size",
    output.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "order item page records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "order item page pages count is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "order item list is suitable for detail rendering",
    output.data.length <= output.pagination.limit,
  );
  for (const item of output.data) {
    typia.assert(item);
    TestValidator.equals(
      "each item belongs to the requested order context",
      item.order.id,
      item.order.id,
    );
    TestValidator.predicate(
      "each item has a positive quantity",
      item.quantity > 0,
    );
    TestValidator.predicate(
      "each item has a current status",
      item.status.length > 0,
    );
    TestValidator.predicate(
      "each item has a product variant summary",
      item.productVariant.id.length > 0,
    );
    TestValidator.predicate(
      "each item has a seller summary",
      item.seller.id.length > 0,
    );
    TestValidator.predicate(
      "each item has a creation timestamp",
      item.created_at.length > 0,
    );
    TestValidator.predicate(
      "each item has an update timestamp",
      item.updated_at.length > 0,
    );
  }
}
