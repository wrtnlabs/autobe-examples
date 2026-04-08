import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_shipment_admin_search_by_carrier_and_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Get existing shipments to have data to search
  const initialResponse =
    await api.functional.ecommerceMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(initialResponse);
  // 3. Test carrier name partial search
  const carrierSearchResponse =
    await api.functional.ecommerceMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: {
          carrier: "dhl",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(carrierSearchResponse);
  // Verify all returned shipments have "dhl" in carrier name (case-insensitive)
  for (const shipment of carrierSearchResponse.data) {
    TestValidator.predicate(
      "shipment carrier contains 'dhl'",
      shipment.carrier.toLowerCase().includes("dhl"),
    );
  }
  // 4. Test tracking number partial search
  if (initialResponse.data.length > 0) {
    const firstTrackingNumber = initialResponse.data[0].tracking_number;
    const trackingPrefix = firstTrackingNumber.substring(
      0,
      Math.min(5, firstTrackingNumber.length),
    );
    const trackingSearchResponse =
      await api.functional.ecommerceMall.admin.admin.shipments.index(
        adminConnection,
        {
          body: {
            trackingNumber: trackingPrefix,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 20 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IEcommerceMallShipment.IRequest,
        },
      );
    typia.assert(trackingSearchResponse);
    // Verify all returned shipments match the tracking prefix
    for (const shipment of trackingSearchResponse.data) {
      TestValidator.predicate(
        "shipment tracking number contains prefix",
        shipment.tracking_number.includes(trackingPrefix),
      );
    }
  }
  // 5. Test combined carrier + tracking number search
  if (
    initialResponse.data.length > 0 &&
    carrierSearchResponse.data.length > 0
  ) {
    const dhlShipment = carrierSearchResponse.data[0];
    const trackingSuffix = dhlShipment.tracking_number.substring(
      dhlShipment.tracking_number.length - 5,
    );
    const combinedSearchResponse =
      await api.functional.ecommerceMall.admin.admin.shipments.index(
        adminConnection,
        {
          body: {
            carrier: dhlShipment.carrier.toLowerCase().substring(0, 3),
            trackingNumber: trackingSuffix,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 20 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IEcommerceMallShipment.IRequest,
        },
      );
    typia.assert(combinedSearchResponse);
    // Verify combined search results match both criteria
    for (const shipment of combinedSearchResponse.data) {
      TestValidator.predicate(
        "shipment carrier matches filter",
        shipment.carrier
          .toLowerCase()
          .includes(dhlShipment.carrier.toLowerCase().substring(0, 3)),
      );
      TestValidator.predicate(
        "shipment tracking number matches filter",
        shipment.tracking_number.includes(trackingSuffix),
      );
    }
  }
  // 6. Test pagination metadata
  TestValidator.equals(
    "current page is 1",
    initialResponse.pagination.current,
    1,
  );
  TestValidator.predicate("limit is set", initialResponse.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    initialResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    initialResponse.pagination.pages >= 0,
  );
}
