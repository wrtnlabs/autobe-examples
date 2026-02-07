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

export async function test_api_order_shipments_filter_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Filter parameters
  const status = "shipped";
  const dateStart = new Date();
  dateStart.setDate(dateStart.getDate() - 7); // 7 days ago
  const dateEnd = new Date(dateStart.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Filter shipments
  const shipments = await api.functional.ecommerce.admin.orders.shipments.index(
    adminConnection,
    {
      orderId,
      body: {
        status,
        shippingDateFrom: dateStart.toISOString(),
        shippingDateTo: dateEnd.toISOString(),
      } satisfies IEcommerceShipment.IRequest,
    },
  );
  typia.assert(shipments);
  // 4. Validate results
  if (shipments.data.length > 0) {
    TestValidator.equals(
      "shipment status matches query",
      shipments.data[0].status,
      status,
    );
    const shippingDate = new Date(shipments.data[0].shipping_date);
    TestValidator.predicate(
      "shipping date within date range",
      shippingDate >= dateStart && shippingDate <= dateEnd,
    );
  } else {
    TestValidator.equals("no shipments returned", shipments.data.length, 0);
  }
}
