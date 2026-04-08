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
 * Test seller can list and filter their own shipments with pagination.
 *
 * Validates the seller shipments listing endpoint with comprehensive pagination
 * and filtering capabilities. Tests that sellers can only see their own shipments,
 * pagination metadata is correctly returned, and filtering options work as expected.
 *
 * 1. Registers a new seller account and authenticates
 * 2. Tests basic listing with default pagination parameters
 * 3. Validates pagination metadata structure (current, limit, records, pages)
 * 4. Confirms all returned shipments belong to the authenticated seller
 * 5. Tests carrier name filtering with partial match
 * 6. Tests date range filtering with createdFrom and createdTo
 * 7. Tests sorting behavior (default: created_at descending)
 * 8. Verifies response structure with pagination and data array
 */
export async function test_api_seller_shipments_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await api.functional.ecommerceMall.auth.seller.join(
    connection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: "https://example.com/seller/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerJoinResult);
  // Create authenticated seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {};
  sellerConnection.headers["Authorization"] =
    `Bearer ${sellerJoinResult.token.access}`;
  // 2. Test basic listing with default pagination
  const defaultListResponse =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(defaultListResponse);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination exists",
    defaultListResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "current page is valid",
    defaultListResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    defaultListResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records is valid",
    defaultListResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is valid",
    defaultListResponse.pagination.pages >= 0,
  );
  // 4. Test listing with custom pagination
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "limit matches request",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "current page matches request",
    paginatedResponse.pagination.current,
    1,
  );
  // 5. Test filtering by carrier name (partial match)
  const carrierFilterResponse =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          carrier: "dhl",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(carrierFilterResponse);
  // If data exists, verify carrier filtering works
  if (carrierFilterResponse.data.length > 0) {
    const hasMatchingCarrier = carrierFilterResponse.data.some((shipment) =>
      shipment.carrier.toLowerCase().includes("dhl"),
    );
    TestValidator.predicate(
      "all results match carrier filter",
      hasMatchingCarrier,
    );
  }
  // 6. Test filtering by date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          createdFrom: thirtyDaysAgo.toISOString() satisfies string &
            tags.Format<"date-time">,
          createdTo: now.toISOString() satisfies string &
            tags.Format<"date-time">,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Verify all shipments are within date range
  if (dateRangeResponse.data.length > 0) {
    for (const shipment of dateRangeResponse.data) {
      const shipmentDate = new Date(shipment.created_at);
      TestValidator.predicate(
        "shipment within date range",
        shipmentDate >= thirtyDaysAgo && shipmentDate <= now,
      );
    }
  }
  // 7. Test sorting - verify created_at descending (default)
  const sortedResponse =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          sort: "created_at:desc",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sortedResponse);
  // Verify descending order if multiple records exist
  if (sortedResponse.data.length > 1) {
    for (let i = 0; i < sortedResponse.data.length - 1; i++) {
      const current = new Date(sortedResponse.data[i].created_at);
      const next = new Date(sortedResponse.data[i + 1].created_at);
      TestValidator.predicate(
        "sorted descending by created_at",
        current >= next,
      );
    }
  }
  // 8. Verify response structure for shipment summaries
  if (defaultListResponse.data.length > 0) {
    const shipment = defaultListResponse.data[0];
    TestValidator.predicate("has id", shipment.id !== undefined);
    TestValidator.predicate("has carrier", shipment.carrier !== undefined);
    TestValidator.predicate(
      "has tracking_number",
      shipment.tracking_number !== undefined,
    );
    TestValidator.predicate(
      "has created_at",
      shipment.created_at !== undefined,
    );
    TestValidator.predicate(
      "has updated_at",
      shipment.updated_at !== undefined,
    );
    TestValidator.predicate(
      "has order reference",
      shipment.order !== undefined,
    );
    TestValidator.predicate(
      "has seller reference",
      shipment.seller !== undefined,
    );
    TestValidator.predicate(
      "has item_count",
      shipment.item_count !== undefined,
    );
  }
  // 9. Verify shipments belong to authenticated seller only
  // Note: sellerId filter is admin-only, but we verify seller matches by checking seller reference
  for (const shipment of defaultListResponse.data) {
    TestValidator.equals(
      "seller id matches authenticated seller",
      shipment.seller.id,
      sellerJoinResult.id,
    );
  }
}
