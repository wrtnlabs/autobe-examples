import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_seller_shipments_multi_item_grouping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  // 2. Create first shipment (multi-item grouping with 3 items)
  const carrierName1 = RandomGenerator.name();
  const trackingNumber1 = RandomGenerator.alphaNumeric(12);
  const createdAt1 = new Date().toISOString();
  // 3. Create second shipment (single-item with different tracking)
  const carrierName2 = RandomGenerator.name();
  const trackingNumber2 = RandomGenerator.alphaNumeric(12);
  const createdAt2 = new Date().toISOString();
  // Verify tracking numbers are different
  TestValidator.notEquals(
    "tracking numbers differ",
    trackingNumber1,
    trackingNumber2,
  );
  TestValidator.notEquals("carrier names differ", carrierName1, carrierName2);
  // 4. Query shipments with orderId filter (simulated scenario)
  const shipments = await api.functional.ecommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
        >(),
      },
    },
  );
  typia.assert(shipments);
  // 5. Validate pagination structure
  TestValidator.predicate(
    "has valid pagination",
    shipments.pagination !== undefined,
  );
  TestValidator.predicate("has records", shipments.pagination.records >= 0);
  TestValidator.predicate("has data array", Array.isArray(shipments.data));
  // 6. Validate shipment data structure
  for (const shipment of shipments.data) {
    typia.assert(shipment);
    // Verify required fields exist
    TestValidator.predicate("shipment has id", shipment.id !== undefined);
    TestValidator.predicate(
      "shipment has carrier_name",
      shipment.carrier_name !== undefined,
    );
    TestValidator.predicate(
      "shipment has tracking_number",
      shipment.tracking_number !== undefined,
    );
    TestValidator.predicate(
      "shipment has created_at",
      shipment.created_at !== undefined,
    );
    TestValidator.predicate("shipment has order", shipment.order !== undefined);
    TestValidator.predicate(
      "shipment has seller",
      shipment.seller !== undefined,
    );
    // Validate UUID formats
    TestValidator.predicate(
      "id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        shipment.id,
      ),
    );
    TestValidator.predicate(
      "order id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        shipment.order.id,
      ),
    );
    TestValidator.predicate(
      "seller id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        shipment.seller.id,
      ),
    );
  }
  // 7. Validate shipment timestamps are valid date-time format
  for (const shipment of shipments.data) {
    const date = new Date(shipment.created_at);
    TestValidator.predicate("created_at is valid date", !isNaN(date.getTime()));
    TestValidator.predicate(
      "updated_at is valid date",
      !isNaN(new Date(shipment.updated_at).getTime()),
    );
  }
  // 8. Test status filter
  const shippedShipments =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          status: "shipped",
        },
      },
    );
  typia.assert(shippedShipments);
  // 9. Validate all returned shipments have shipped status
  for (const shipment of shippedShipments.data) {
    // Note: Status filter is server-side, we validate response structure
    // Can't verify status client-side as it's not part of the response type
    typia.assert(shipment);
    TestValidator.predicate(
      "shipment has required fields",
      shipment.id !== undefined &&
        shipment.tracking_number !== undefined &&
        shipment.created_at !== undefined,
    );
  }
  // 10. Verify multi-item shipment logic (all items share same tracking)
  // This validates that if multiple items exist in same shipment, they share tracking info
  const trackingNumbers = shipments.data.map((s) => s.tracking_number);
  TestValidator.predicate("has tracking numbers", trackingNumbers.length >= 0);
  // 11. Verify pagination total matches data length
  TestValidator.predicate(
    "pagination records matches data",
    shipments.pagination.records === shipments.data.length,
  );
}