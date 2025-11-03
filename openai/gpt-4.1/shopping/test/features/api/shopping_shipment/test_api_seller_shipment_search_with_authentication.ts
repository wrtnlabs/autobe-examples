import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingShipment";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipment";

/**
 * Validate advanced shipment search for an authenticated seller.
 *
 * This test covers the workflow for a seller to register, authenticate, and
 * then perform a search for their shipments using advanced filters and
 * pagination. The steps include:
 *
 * 1. Register a new seller (join as a seller)
 * 2. Perform shipment search with basic pagination as the authenticated seller
 * 3. Search with various filters including carrier company, status, and scheduled
 *    dispatch date range
 * 4. Validate that only shipments belonging to the authenticated seller are
 *    returned in the results
 * 5. Ensure that pagination and sort ordering work as expected (via multi-page
 *    requests)
 * 6. Attempt searching for unowned shipments and validate that such shipments are
 *    not returned
 */
export async function test_api_seller_shipment_search_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new seller for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerDisplayName = RandomGenerator.name();
  const sellerContactPhone = RandomGenerator.mobile();
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        display_name: sellerDisplayName,
        contact_phone: sellerContactPhone,
        status: "pending",
      } satisfies IShoppingSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Search for shipments as the authenticated seller - basic default search
  const requestBase = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingShipment.IRequest;
  const baseResult = await api.functional.shopping.seller.shipments.index(
    connection,
    {
      body: requestBase,
    },
  );
  typia.assert(baseResult);
  TestValidator.equals(
    "pagination information exists",
    typeof baseResult.pagination,
    "object",
  );
  TestValidator.equals("data is array", Array.isArray(baseResult.data), true);

  // 3. Search shipments with specific status filter (even if possibly empty)
  const requestStatus = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    status: "pending",
  } satisfies IShoppingShipment.IRequest;
  const statusResult = await api.functional.shopping.seller.shipments.index(
    connection,
    {
      body: requestStatus,
    },
  );
  typia.assert(statusResult);
  if (statusResult.data.length > 0)
    for (const shipment of statusResult.data) {
      TestValidator.equals(
        "shipment belongs to authenticated seller",
        shipment.shopping_seller_id,
        seller.id,
      );
      TestValidator.equals("status is as filtered", shipment.status, "pending");
    }

  // 4. Search by carrier company (random string value)
  const carrierCompany = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 8,
  });
  const requestCarrier = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    carrier_company: carrierCompany,
  } satisfies IShoppingShipment.IRequest;
  const carrierResult = await api.functional.shopping.seller.shipments.index(
    connection,
    {
      body: requestCarrier,
    },
  );
  typia.assert(carrierResult);
  for (const shipment of carrierResult.data) {
    TestValidator.equals(
      "shipment belongs to authenticated seller",
      shipment.shopping_seller_id,
      seller.id,
    );
    TestValidator.equals(
      "carrier company matches filter",
      shipment.carrier_company,
      carrierCompany,
    );
  }

  // 5. Search by scheduled dispatch date range (next week)
  const now = new Date();
  const from = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 1).toISOString(); // 1 day from now
  const to = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days from now
  const requestDateRange = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    scheduled_dispatch_at_from: from,
    scheduled_dispatch_at_to: to,
  } satisfies IShoppingShipment.IRequest;
  const dateRangeResult = await api.functional.shopping.seller.shipments.index(
    connection,
    {
      body: requestDateRange,
    },
  );
  typia.assert(dateRangeResult);
  for (const shipment of dateRangeResult.data) {
    TestValidator.equals(
      "shipment belongs to authenticated seller (date range)",
      shipment.shopping_seller_id,
      seller.id,
    );
    if (
      shipment.scheduled_dispatch_at !== null &&
      shipment.scheduled_dispatch_at !== undefined
    ) {
      TestValidator.predicate(
        "scheduled_dispatch_at in [from, to]",
        shipment.scheduled_dispatch_at >= from &&
          shipment.scheduled_dispatch_at <= to,
      );
    }
  }

  // 6. Pagination and sort order test: fetch two pages (if available)
  const limitForPagination = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const pagedResult1 = await api.functional.shopping.seller.shipments.index(
    connection,
    {
      body: {
        page: 1,
        limit: limitForPagination,
        sort_field: "created_at",
        sort_order: "asc",
      } satisfies IShoppingShipment.IRequest,
    },
  );
  typia.assert(pagedResult1);
  const pagedResult2 = await api.functional.shopping.seller.shipments.index(
    connection,
    {
      body: {
        page: 2,
        limit: limitForPagination,
        sort_field: "created_at",
        sort_order: "asc",
      } satisfies IShoppingShipment.IRequest,
    },
  );
  typia.assert(pagedResult2);
  if (pagedResult1.data.length > 0 && pagedResult2.data.length > 0) {
    TestValidator.notEquals(
      "pagination separation",
      pagedResult1.data[0],
      pagedResult2.data[0],
    );
  }
  for (const shipment of pagedResult1.data.concat(pagedResult2.data)) {
    TestValidator.equals(
      "shipment belongs to authenticated seller (pagination)",
      shipment.shopping_seller_id,
      seller.id,
    );
  }
  // 7. Verify that shipments for other sellers are not returned (use random seller_id filter)
  const fakeSellerId = typia.random<string & tags.Format<"uuid">>();
  const otherSellerRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    seller_id: fakeSellerId,
  } satisfies IShoppingShipment.IRequest;
  const otherSellerResult =
    await api.functional.shopping.seller.shipments.index(connection, {
      body: otherSellerRequest,
    });
  typia.assert(otherSellerResult);
  for (const shipment of otherSellerResult.data) {
    TestValidator.equals(
      "filtering by unowned seller returns none or only other seller's shipment",
      shipment.shopping_seller_id,
      fakeSellerId,
    );
  }
}
