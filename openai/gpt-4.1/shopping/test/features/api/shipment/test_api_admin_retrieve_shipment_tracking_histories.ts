import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentTrackingHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistory";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Validate admin retrieval of shipment tracking history event logs.
 *
 * Business context: Platform admins must be able to view tracking histories for
 * any shipment using advanced filter/search (e.g., by status/event_code),
 * pagination, and ensure all results and paging are accurate. This scenario
 * covers onboarding a new admin, registering a shipping partner, creating a
 * shipment as an admin, and testing full/filtered access to tracking
 * histories.
 *
 * Step-by-step process:
 *
 * 1. Register and authenticate a new admin (join operation, ensures token context)
 * 2. Create a new shipping partner as admin (ensure shipping partner registry is
 *    working)
 * 3. Construct minimal valid order/item data (mock order/item summary objects
 *    directly, as no product/order creation API is available)
 * 4. Create a shipment referencing the partner and new order item, designating the
 *    admin as creator
 * 5. Call trackingHistories.index for the shipmentId, passing IRequest with no
 *    filters (should return all event logs, paged)
 * 6. Validate that the API responds with paginated tracking histories, ordered
 *    chronologically (event_time ascending), and all returned entities are
 *    valid and belong to the shipment
 * 7. If tracking events exist, run a filtered search by a status/event_code from
 *    results and validate that only the correct filtered events are included
 * 8. Confirm paging metadata (pagination current page/limit/records/pages) is
 *    correct and logically consistent
 * 9. Test forbidden case by re-joining as a different admin and attempting to
 *    access the same shipment's events (should succeed for admin actor, as
 *    admins have universal access; test negative cases in non-admin E2Es)
 */
export async function test_api_admin_retrieve_shipment_tracking_histories(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(8) + "!1A", // password: ≥8 chars, with symbol/digit/case
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2. Create a new shipping partner as admin
  const partnerBody = {
    partner_name: RandomGenerator.name(2),
    partner_code: RandomGenerator.alphaNumeric(8),
    status: "active",
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallShippingPartner.ICreate;
  const partner: IShoppingMallShippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      { body: partnerBody },
    );
  typia.assert(partner);

  // 3. Prepare minimal valid mock order/item/sku summaries (simulate as E2E infra provides no order API)
  const mockOrder: IShoppingMallOrder.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    order_number: RandomGenerator.alphaNumeric(12),
    status: "pending",
    total_amount: Math.floor(Math.random() * 100000) + 10000,
    currency: "KRW",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  const mockProductSku: IShoppingMallProductSku.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    code: RandomGenerator.alphaNumeric(10),
    product_title: RandomGenerator.name(2),
    option_summary: RandomGenerator.paragraph({ sentences: 2 }),
    in_stock: true,
  };
  const mockOrderItem: IShoppingMallOrderItem.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_id: mockOrder.id,
    sku: mockProductSku,
    quantity: 2,
    unit_price: 8990,
    subtotal: 17980,
    currency: "KRW",
    delivered: false,
    refunded: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 4. Create shipment as admin
  const shipmentBody = {
    order_id: mockOrder.id,
    order_item_id: mockOrderItem.id,
    shipping_partner_id: partner.id,
    carrier_tracking_code: RandomGenerator.alphaNumeric(12),
    status: "pending",
    manifest_url: null,
    provider_response_code: null,
    created_by_admin_id: adminAuth.id,
    created_by_seller_id: null,
  } satisfies IShoppingMallShipment.ICreate;
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.shipments.create(connection, {
      body: shipmentBody,
    });
  typia.assert(shipment);

  // 5. Retrieve tracking histories (all events, page 1, limit 10, no filters)
  const trackingRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallShipmentTrackingHistory.IRequest;
  const trackingPage: IPageIShoppingMallShipmentTrackingHistory =
    await api.functional.shoppingMall.admin.shipments.trackingHistories.index(
      connection,
      {
        shipmentId: shipment.id,
        body: trackingRequest,
      },
    );
  typia.assert(trackingPage);

  // 6. Validate returned events are for this shipment and are in chronological order
  for (const event of trackingPage.data) {
    typia.assert(event);
    TestValidator.equals(
      "event shipment_id matches",
      event.shipment_id,
      shipment.id,
    );
  }
  if (trackingPage.data.length > 1) {
    for (let i = 1; i < trackingPage.data.length; ++i) {
      TestValidator.predicate(
        `events ordered by event_time ascending at index ${i}`,
        trackingPage.data[i].event_time >= trackingPage.data[i - 1].event_time,
      );
    }
  }
  // 7. If any event exists, run filter by one status and event_code for refined search
  if (trackingPage.data.length > 0) {
    const status = trackingPage.data[0].status;
    const eventCode = trackingPage.data[0].event_code ?? undefined;
    const filteredRequest = {
      status,
      event_code: eventCode,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    } satisfies IShoppingMallShipmentTrackingHistory.IRequest;
    const filteredPage: IPageIShoppingMallShipmentTrackingHistory =
      await api.functional.shoppingMall.admin.shipments.trackingHistories.index(
        connection,
        {
          shipmentId: shipment.id,
          body: filteredRequest,
        },
      );
    typia.assert(filteredPage);
    for (const filtered of filteredPage.data) {
      typia.assert(filtered);
      TestValidator.equals(
        "filtered event shipment_id matches",
        filtered.shipment_id,
        shipment.id,
      );
      TestValidator.equals(
        "filtered event status matches",
        filtered.status,
        status,
      );
      if (eventCode !== undefined) {
        TestValidator.equals(
          "filtered event_code matches",
          filtered.event_code,
          eventCode,
        );
      }
    }
  }
  // 8. Validate pagination metadata
  const pag = trackingPage.pagination;
  typia.assert(pag);
  TestValidator.predicate("pagination current page >= 1", pag.current >= 1);
  TestValidator.predicate(
    "pagination limit between 1 and 100",
    pag.limit >= 1 && pag.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records >= returned data length",
    pag.records >= trackingPage.data.length,
  );
  TestValidator.predicate("pagination pages >= 1", pag.pages >= 1);
  // 9. Register another admin and confirm can access same shipment's tracking histories
  const admin2JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(8) + "!2B",
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin2Auth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: admin2JoinBody });
  typia.assert(admin2Auth);
  // Reuse the same connection (admin's token should be updated automatically)
  const admin2Page: IPageIShoppingMallShipmentTrackingHistory =
    await api.functional.shoppingMall.admin.shipments.trackingHistories.index(
      connection,
      {
        shipmentId: shipment.id,
        body: trackingRequest,
      },
    );
  typia.assert(admin2Page);
  for (const event of admin2Page.data) {
    typia.assert(event);
    TestValidator.equals(
      "cross-admin event shipment_id matches",
      event.shipment_id,
      shipment.id,
    );
  }
}
