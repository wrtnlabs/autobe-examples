import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
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

export async function test_api_shipment_admin_view_all_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Fetch all shipments with default pagination (page 1, limit 20)
  const shipments = await api.functional.ecommerceMall.admin.shipments.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  // 3. Validate response structure
  typia.assert(shipments);
  // 4. Verify pagination metadata
  TestValidator.predicate(
    "current page is 1",
    shipments.pagination.current === 1,
  );
  TestValidator.predicate("limit is 20", shipments.pagination.limit === 20);
  TestValidator.predicate(
    "records is non-negative",
    shipments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    shipments.pagination.pages >= 0,
  );
  // 5. Verify data array exists
  TestValidator.predicate("data array exists", Array.isArray(shipments.data));
  // 6. If there are shipments, validate each one has required fields
  if (shipments.data.length > 0) {
    for (const shipment of shipments.data) {
      typia.assert(shipment);
      TestValidator.predicate("has id", typeof shipment.id === "string");
      TestValidator.predicate(
        "has sellerId",
        typeof shipment.sellerId === "string",
      );
      TestValidator.predicate(
        "has orderId",
        typeof shipment.orderId === "string",
      );
      TestValidator.predicate(
        "has carrierName",
        typeof shipment.carrierName === "string",
      );
      TestValidator.predicate(
        "has trackingNumber",
        typeof shipment.trackingNumber === "string",
      );
      TestValidator.predicate(
        "has shippedAt",
        typeof shipment.shippedAt === "string",
      );
      TestValidator.predicate("has seller summary", shipment.seller !== null);
      TestValidator.predicate("has order summary", shipment.order !== null);
      TestValidator.predicate(
        "delivery is null or ISummary",
        shipment.delivery === null || typeof shipment.delivery === "object",
      );
    }
  }
}
