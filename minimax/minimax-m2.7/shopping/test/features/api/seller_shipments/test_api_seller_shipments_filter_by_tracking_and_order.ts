import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller shipment listing with tracking number and order ID filters.
 *
 * Validates the seller shipment search endpoint by testing various filter combinations
 * including partial tracking number matching, order ID filtering, and soft-delete handling.
 * The endpoint PATCH /ecommerceMall/seller/shipments returns paginated shipment summaries
 * with optional filtering by tracking number (partial match), order ID (exact match), and
 * includeDeleted flag for viewing soft-deleted records.
 *
 * 1. Registers a new seller account using the join utility function
 * 2. Tests filtering shipments by partial tracking number match
 * 3. Tests filtering shipments by order ID (exact match)
 * 4. Tests includeDeleted parameter to show/hide soft-deleted shipments
 * 5. Validates pagination structure and item_count aggregation
 * 6. Verifies that filters correctly narrow down results
 */
export async function test_api_seller_shipments_filter_by_tracking_and_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // Update seller connection with auth token
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = sellerAuth.token.access;
  // 2. Test listing with no filters - should return paginated list structure
  const emptyListResponse =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(emptyListResponse);
  TestValidator.equals(
    "has pagination info",
    "pagination" in emptyListResponse,
    true,
  );
  TestValidator.equals("has data array", "data" in emptyListResponse, true);
  TestValidator.predicate(
    "pagination has current",
    emptyListResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    emptyListResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    emptyListResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    emptyListResponse.pagination.pages >= 0,
  );
  // 3. Test filtering by partial tracking number (should match anything with those chars)
  const trackingFilterResponse =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          trackingNumber: "TRACK",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(trackingFilterResponse);
  // All returned shipments should have tracking numbers containing "TRACK" (case-insensitive partial match)
  for (const shipment of trackingFilterResponse.data) {
    TestValidator.predicate(
      `tracking number "${shipment.tracking_number}" contains "TRACK"`,
      shipment.tracking_number.toUpperCase().includes("TRACK"),
    );
  }
  // 4. Test filtering by order ID (UUID format filter) - using random UUID that won't match any order
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  const orderIdFilterResponse =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          orderId: nonExistentOrderId,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(orderIdFilterResponse);
  // Filtering by non-existent order ID should return empty results
  TestValidator.equals(
    "filtering by non-existent order ID returns empty list",
    orderIdFilterResponse.data.length,
    0,
  );
  // 5. Test includeDeleted parameter - default behavior excludes deleted
  const defaultExcludeResponse =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          includeDeleted: false,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(defaultExcludeResponse);
  // When includeDeleted is false, should not return soft-deleted shipments
  TestValidator.predicate(
    "data is array",
    Array.isArray(defaultExcludeResponse.data),
  );
  // 6. Test includeDeleted=true to include soft-deleted shipments
  const includeDeletedResponse =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          includeDeleted: true,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(includeDeletedResponse);
  TestValidator.predicate(
    "includeDeleted true returns data",
    includeDeletedResponse.data !== undefined,
  );
  // 7. Test combined filters - tracking number AND includeDeleted
  const combinedFilterResponse =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          trackingNumber: "TEST",
          includeDeleted: false,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Results should match both filters
  for (const shipment of combinedFilterResponse.data) {
    TestValidator.predicate(
      `combined filter: tracking contains "TEST"`,
      shipment.tracking_number.toUpperCase().includes("TEST"),
    );
  }
  // 8. Test pagination parameters
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals("page is 1", paginatedResponse.pagination.current, 1);
  TestValidator.equals("limit is 10", paginatedResponse.pagination.limit, 10);
  TestValidator.predicate(
    "data length <= limit",
    paginatedResponse.data.length <= 10,
  );
  // 9. Test carrier filter (partial match like tracking number)
  const carrierFilterResponse =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          carrier: "DHL",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(carrierFilterResponse);
  for (const shipment of carrierFilterResponse.data) {
    TestValidator.predicate(
      `carrier "${shipment.carrier}" contains "DHL"`,
      shipment.carrier.toUpperCase().includes("DHL"),
    );
  }
  // 10. Verify item_count is present and valid in each shipment summary
  for (const shipment of emptyListResponse.data) {
    TestValidator.predicate(
      "item_count is non-negative integer",
      shipment.item_count >= 0,
    );
  }
}
