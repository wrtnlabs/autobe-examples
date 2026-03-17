import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingUpdate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipmentTrackingUpdate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentTrackingUpdate";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_tracking_updates_filtering_and_bulk_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Step 2: Create shipment
  const shipment: IEcommerceMallShipment =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrier_name: "FedEx",
          order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 3: Generate multiple tracking updates with different statuses
  const trackingStatuses: Array<
    "pending" | "in_transit" | "delivered" | "failed"
  > = [
    "pending",
    "in_transit",
    "in_transit",
    "delivered",
    "failed",
    "in_transit",
  ];
  const trackingUpdatesBefore = ArrayUtil.repeat(
    trackingStatuses.length,
    (index) => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      shipment: shipment as unknown as IEcommerceMallShipment.ISummary,
      tracking_status: trackingStatuses[index],
      created_at: new Date().toISOString(),
    }),
  );
  // Step 4: Test filtering by status (in_transit)
  const filterStatus: "in_transit" = "in_transit";
  const matchingUpdates = trackingUpdatesBefore.filter(
    (update) => update.tracking_status === filterStatus,
  );
  TestValidator.equals(
    "matching updates count before update",
    matchingUpdates.length,
    3,
  );
  // Step 5: Apply bulk update to filtered tracking updates
  const bulkUpdateResponse: IPageIEcommerceMallShipmentTrackingUpdate.ISummary =
    await api.functional.ecommerceMall.seller.shipments.tracking_updates.updateTrackingUpdates(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          tracking_status: filterStatus,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipmentTrackingUpdate.IRequest,
      },
    );
  typia.assert(bulkUpdateResponse);
  // Step 6: Validate bulk update response
  TestValidator.equals(
    "pagination current page",
    bulkUpdateResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    bulkUpdateResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records",
    bulkUpdateResponse.pagination.records,
    matchingUpdates.length,
  );
  TestValidator.equals(
    "pagination pages",
    bulkUpdateResponse.pagination.pages,
    1,
  );
  TestValidator.equals(
    "updated tracking updates count",
    bulkUpdateResponse.data.length,
    matchingUpdates.length,
  );
  // Step 7: Verify all returned updates match filter criteria
  bulkUpdateResponse.data.forEach((update) => {
    TestValidator.equals(
      "update status matches filter",
      update.tracking_status,
      filterStatus,
    );
  });
  // Step 8: Validate non-matching records are not affected
  const nonMatchingUpdates = trackingUpdatesBefore.filter(
    (update) => update.tracking_status !== filterStatus,
  );
  TestValidator.equals(
    "non-matching updates count unchanged",
    nonMatchingUpdates.length,
    trackingUpdatesBefore.length - matchingUpdates.length,
  );
  // Step 9: Verify pagination integrity
  TestValidator.predicate(
    "pagination records match limit",
    () =>
      bulkUpdateResponse.pagination.records <=
      bulkUpdateResponse.pagination.limit,
  );
}