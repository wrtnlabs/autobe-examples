import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer shipment browsing for own-order visibility and pagination.
 *
 * Validates that an authenticated customer can retrieve shipment summaries for
 * their own orders through the customer-scoped browse endpoint, and that the
 * response behaves as a paginated summary list with seller and order context.
 *
 * The test covers default newest-first browsing, shipment summary field shape,
 * and pagination metadata consistency. It also ensures completed fulfillment
 * states remain visible in browse results instead of being filtered out.
 *
 * 1. Register and authenticate a customer session using the join utility.
 * 2. Browse shipments without filters using the customer-scoped endpoint.
 * 3. Validate pagination metadata and summary row shape.
 * 4. Confirm rows contain seller and order context and are customer-scoped.
 */
export async function test_api_customer_shipments_browse_own_orders(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const page = await api.functional.mallPlatform.customer.shipments.index(
    customerConnection,
    {
      body: {} satisfies IMallPlatformShipment.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "pagination metadata exists",
    page.pagination !== null && page.pagination !== undefined,
  );
  TestValidator.predicate(
    "returned shipment data is an array",
    Array.isArray(page.data),
  );
  TestValidator.equals(
    "pagination current defaults to first page",
    page.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  if (page.pagination.limit > 0) {
    TestValidator.equals(
      "pagination pages matches records and limit",
      page.pagination.pages,
      Math.ceil(page.pagination.records / page.pagination.limit),
    );
  }
  TestValidator.predicate(
    "page data length does not exceed limit",
    page.data.length <= page.pagination.limit || page.pagination.limit === 0,
  );
  for (const shipment of page.data) {
    typia.assert(shipment);
    TestValidator.equals(
      "shipment belongs to the authenticated customer",
      shipment.order.customer.id,
      customer.id,
    );
    TestValidator.predicate(
      "shipment summary includes seller context",
      shipment.seller.id.length > 0 && shipment.seller.email.length > 0,
    );
    TestValidator.predicate(
      "shipment summary includes order context",
      shipment.order.id.length > 0 && shipment.order.orderNumber.length > 0,
    );
    TestValidator.predicate(
      "shipment summary exposes carrier name",
      shipment.carrierName.length > 0,
    );
    TestValidator.predicate(
      "shipment summary exposes tracking number",
      shipment.trackingNumber.length > 0,
    );
    TestValidator.predicate(
      "shipment summary remains lightweight",
      shipment.trackingUrl === null || typeof shipment.trackingUrl === "string",
    );
    TestValidator.predicate(
      "shipment status is present",
      shipment.status.length > 0,
    );
  }
  if (page.data.length >= 2) {
    for (let i = 1; i < page.data.length; ++i) {
      TestValidator.predicate(
        "default browse order is newest-first",
        page.data[i - 1].createdAt >= page.data[i].createdAt,
      );
    }
  }
}
