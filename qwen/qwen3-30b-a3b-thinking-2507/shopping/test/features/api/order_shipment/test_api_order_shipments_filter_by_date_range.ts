import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_shipments_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin123!",
    },
  });
  // 2. Define date range
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - 10); // 10 days ago
  const endDate = new Date(now);
  endDate.setDate(now.getDate() - 5); // 5 days ago
  // 3. Make API call with date range
  const shipments = await api.functional.ecommerce.admin.orders.shipments.index(
    adminConnection,
    {
      orderId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        shippingDateFrom: startDate.toISOString(),
        shippingDateTo: endDate.toISOString(),
      },
    },
  );
  // Ensure shipments has the correct type
  const safeShipments =
    typia.assert<IPageIEcommerceShipment.ISummary>(shipments);
  // 4. Validate that all shipments are within the date range
  for (const shipment of safeShipments.data) {
    const shippingDate = new Date(shipment.shipping_date);
    TestValidator.predicate(
      "shipment shipping date within range",
      shippingDate >= startDate && shippingDate <= endDate,
    );
  }
}
