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

export async function test_api_shipment_admin_filter_by_seller_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Generate a seller ID for filtering
  const filterSellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Define date range for filtering
  const shippedAtFrom = "2025-01-01T00:00:00Z";
  const shippedAtTo = "2025-12-31T23:59:59Z";
  // 4. Call the admin shipments endpoint with seller and date filters
  const response = await api.functional.ecommerceMall.admin.shipments.index(
    adminConnection,
    {
      body: {
        sellerId: filterSellerId,
        shippedAtFrom,
        shippedAtTo,
        sort: ["-shippedAt"],
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(response);
  // 5. Validate that all returned shipments match the filter criteria
  for (const shipment of response.data) {
    TestValidator.equals(
      "shipment sellerId matches filter",
      shipment.sellerId,
      filterSellerId,
    );
    TestValidator.equals(
      "shipment seller.id matches filter",
      shipment.seller.id,
      filterSellerId,
    );
    const shippedAt = new Date(shipment.shippedAt).getTime();
    const fromTime = new Date(shippedAtFrom).getTime();
    const toTime = new Date(shippedAtTo).getTime();
    TestValidator.predicate(
      "shippedAt is within date range",
      shippedAt >= fromTime && shippedAt <= toTime,
    );
  }
  // 6. Validate sorting (descending by shippedAt)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prev = new Date(response.data[i - 1].shippedAt).getTime();
      const curr = new Date(response.data[i].shippedAt).getTime();
      TestValidator.predicate(
        "shipments sorted by shippedAt descending",
        prev >= curr,
      );
    }
  }
}
