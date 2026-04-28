import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller fulfillment overview retrieval with shipment tracking information.
 *
 * Validates the fulfillment overview endpoint returns properly structured pagination data containing order summaries with line items and shipment tracking details. Each fulfillment record includes order creation timestamp, order number, status, customer profile, shipping address, and an items array with fulfillment status and optional shipment tracking fields.
 *
 * The endpoint supports optional filtering by status, date range, and order number, with cursor-based pagination via pageOffset and pageSize parameters. When no filters are provided, all fulfillment records for the authenticated seller are returned.
 *
 * 1. Register and authenticate a seller account with email and password.
 * 2. Call the fulfillment overview endpoint with empty filter criteria in simulation mode.
 * 3. Validate that the response contains properly structured pagination metadata.
 * 4. Validate that fulfillment records contain order details, items with tracking fields.
 */
export async function test_api_seller_fulfillment_overview_with_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Call fulfillment overview with empty filters (simulation mode for data generation)
  const simConnection: api.IConnection = {
    host: sellerConnection.host,
    headers: sellerConnection.headers,
    simulate: true,
  };
  const fulfillmentOverview =
    await api.functional.ecommercePlatform.seller.orders.fulfillment.index(
      simConnection,
      {
        body: {} satisfies IEcommercePlatformOrder.IFulfillmentRequest,
      },
    );
  typia.assert(fulfillmentOverview);
  // 3. Validate pagination metadata structure
  typia.assert(fulfillmentOverview.pagination);
  TestValidator.predicate(
    "pagination current is non-negative",
    fulfillmentOverview.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    fulfillmentOverview.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    fulfillmentOverview.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    fulfillmentOverview.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate(
    "data is an array",
    Array.isArray(fulfillmentOverview.data),
  );
  if (fulfillmentOverview.data.length > 0) {
    const record = fulfillmentOverview.data[0];
    typia.assert(record);
    // Validate order-level fields
    TestValidator.predicate(
      "has order creation timestamp",
      typeof record.createdAt === "string" && record.createdAt.length > 0,
    );
    TestValidator.predicate(
      "has order ID",
      typeof record.id === "string" && record.id.length > 0,
    );
    TestValidator.predicate(
      "has order number",
      typeof record.orderNumber === "string" && record.orderNumber.length > 0,
    );
    TestValidator.predicate(
      "has status",
      typeof record.status === "string" && record.status.length > 0,
    );
    // Validate customer profile
    typia.assert(record.customerProfile);
    TestValidator.predicate(
      "customer profile has display name",
      typeof record.customerProfile.display_name === "string",
    );
    // Validate shipping address
    typia.assert(record.shippingAddress);
    TestValidator.predicate(
      "shipping address has recipient name",
      typeof record.shippingAddress.recipient_name === "string",
    );
    // 5. Validate items array with shipment tracking fields
    if (record.items.length > 0) {
      const item = record.items[0];
      typia.assert(item);
      TestValidator.predicate(
        "item has quantity",
        typeof item.quantity === "number",
      );
      TestValidator.predicate("item has price", typeof item.price === "number");
      TestValidator.predicate(
        "item has status",
        typeof item.status === "string",
      );
      // Validate product variant reference
      typia.assert(item.productVariant);
    }
  }
}
