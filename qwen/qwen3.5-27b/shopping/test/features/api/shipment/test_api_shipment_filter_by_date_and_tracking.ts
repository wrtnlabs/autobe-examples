import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test filtering shipments by date ranges and tracking information.
 *
 * This test validates the shipment search functionality for sellers, including:
 * - Date range filtering (shipped_at_from, shipped_at_to, delivered_at_from, delivered_at_to)
 * - Partial match filtering for tracking carrier and tracking number
 * - Combined filter logic (AND operation)
 * - Pagination with filtered results
 */
export async function test_api_shipment_filter_by_date_and_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Test shipped_at_from filter
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30); // 30 days ago
  const result1 = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        shipped_at_from: fromDate.toISOString(),
        limit: 20,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(result1);
  TestValidator.equals("pagination present", result1.pagination.current, 1);
  for (const shipment of result1.data) {
    TestValidator.predicate(
      `shipment ${shipment.id} shipped_at >= filter date`,
      new Date(shipment.shipped_at) >= fromDate,
    );
  }
  // 3. Test shipped_at_to filter
  const toDate = new Date();
  toDate.setDate(toDate.getDate() - 1); // yesterday
  const result2 = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        shipped_at_to: toDate.toISOString(),
        limit: 20,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(result2);
  for (const shipment of result2.data) {
    TestValidator.predicate(
      `shipment ${shipment.id} shipped_at <= filter date`,
      new Date(shipment.shipped_at) <= toDate,
    );
  }
  // 4. Test shipped_at range (from + to)
  const rangeFrom = new Date();
  rangeFrom.setDate(rangeFrom.getDate() - 15); // 15 days ago
  const rangeTo = new Date();
  rangeTo.setDate(rangeTo.getDate() - 5); // 5 days ago
  const result3 = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        shipped_at_from: rangeFrom.toISOString(),
        shipped_at_to: rangeTo.toISOString(),
        limit: 20,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(result3);
  for (const shipment of result3.data) {
    const shippedDate = new Date(shipment.shipped_at);
    TestValidator.predicate(
      `shipment ${shipment.id} in range`,
      shippedDate >= rangeFrom && shippedDate <= rangeTo,
    );
  }
  // 5. Test delivered_at filters
  const deliveredFrom = new Date();
  deliveredFrom.setDate(deliveredFrom.getDate() - 20);
  const deliveredTo = new Date();
  const result4 = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        delivered_at_from: deliveredFrom.toISOString(),
        delivered_at_to: deliveredTo.toISOString(),
        limit: 20,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(result4);
  for (const shipment of result4.data) {
    TestValidator.predicate(
      `shipment ${shipment.id} has delivered_at`,
      shipment.delivered_at !== null,
    );
    if (shipment.delivered_at !== null) {
      const deliveredDate = new Date(shipment.delivered_at);
      TestValidator.predicate(
        `shipment ${shipment.id} delivered_at in range`,
        deliveredDate >= deliveredFrom && deliveredDate <= deliveredTo,
      );
    }
  }
  // 6. Test tracking_carrier partial match
  const result5 = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        tracking_carrier: "Fed",
        limit: 20,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(result5);
  for (const shipment of result5.data) {
    TestValidator.predicate(
      `shipment ${shipment.id} tracking_carrier contains 'Fed'`,
      shipment.tracking_carrier.toLowerCase().includes("fed"),
    );
  }
  // 7. Test tracking_number partial match
  const result6 = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        tracking_number: "1Z",
        limit: 20,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(result6);
  for (const shipment of result6.data) {
    TestValidator.predicate(
      `shipment ${shipment.id} tracking_number contains '1Z'`,
      shipment.tracking_number.toLowerCase().includes("1z"),
    );
  }
  // 8. Test combined date and tracking filters
  const combinedFrom = new Date();
  combinedFrom.setDate(combinedFrom.getDate() - 10);
  const result7 = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        shipped_at_from: combinedFrom.toISOString(),
        tracking_carrier: "Fed",
        limit: 20,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(result7);
  for (const shipment of result7.data) {
    const shippedDate = new Date(shipment.shipped_at);
    TestValidator.predicate(
      `shipment ${shipment.id} meets all criteria`,
      shippedDate >= combinedFrom &&
        shipment.tracking_carrier.toLowerCase().includes("fed"),
    );
  }
  // 9. Test empty results (no matching shipments)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 365); // 1 year in future
  const result8 = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        shipped_at_from: futureDate.toISOString(),
        limit: 20,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(result8);
  TestValidator.equals("no future shipments", result8.data.length, 0);
  TestValidator.equals("pagination records", result8.pagination.records, 0);
  // 10. Test pagination with filters
  const result9 = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        shipped_at_from: fromDate.toISOString(),
        limit: 10,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(result9);
  TestValidator.equals("page 1 limit", result9.pagination.limit, 10);
  TestValidator.equals("page 1 current", result9.pagination.current, 1);
  TestValidator.predicate(
    "page 1 data count <= limit",
    result9.data.length <= 10,
  );
  // 11. Test status filter - pending
  const result10 = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        status: "pending",
        limit: 20,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(result10);
  for (const shipment of result10.data) {
    TestValidator.predicate(
      `shipment ${shipment.id} is pending`,
      shipment.delivered_at === null,
    );
  }
  // 12. Test status filter - delivered
  const result11 = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        status: "delivered",
        limit: 20,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(result11);
  for (const shipment of result11.data) {
    TestValidator.predicate(
      `shipment ${shipment.id} is delivered`,
      shipment.delivered_at !== null,
    );
  }
  // 13. Test status filter - confirmed
  const result12 = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        status: "confirmed",
        limit: 20,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(result12);
  for (const shipment of result12.data) {
    TestValidator.predicate(
      `shipment ${shipment.id} is confirmed`,
      shipment.delivery_confirmed === true,
    );
  }
  // 14. Verify response structure for each shipment
  const sampleShipment = result1.data[0];
  if (sampleShipment) {
    typia.assert(sampleShipment);
    TestValidator.predicate("shipment has id", sampleShipment.id !== undefined);
    TestValidator.predicate(
      "shipment has tracking_carrier",
      sampleShipment.tracking_carrier !== undefined,
    );
    TestValidator.predicate(
      "shipment has tracking_number",
      sampleShipment.tracking_number !== undefined,
    );
    TestValidator.predicate(
      "shipment has shipped_at",
      sampleShipment.shipped_at !== undefined,
    );
    TestValidator.predicate(
      "shipment has item_count",
      sampleShipment.item_count !== undefined,
    );
    TestValidator.predicate(
      "shipment has seller",
      sampleShipment.seller !== undefined,
    );
  }
}
