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

export async function test_api_order_shipments_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Request shipments for an order, filtered by status
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const result: IPageIEcommerceShipment.ISummary =
    await api.functional.ecommerce.admin.orders.shipments.index(
      adminConnection,
      {
        orderId: orderId,
        body: { status: "shipped" } satisfies IEcommerceShipment.IRequest,
      },
    );
  // 3. Ensure API response validates
  typia.assert(result);
  // 4. Verify all shipments have 'shipped' status
  for (const shipment of result.data) {
    TestValidator.equals(
      "Shipment status is shipped",
      shipment.status,
      "shipped",
    );
  }
  // 5. Validate key shipment fields
  if (result.data.length > 0) {
    const first = result.data[0];
    TestValidator.equals("Carrier exists", first.carrier.length > 0, true);
    TestValidator.equals(
      "Tracking number exists",
      first.tracking_number.length > 0,
      true,
    );
    TestValidator.equals(
      "Shipping date format",
      first.shipping_date.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/) !== null,
      true,
    );
    TestValidator.equals(
      "Estimated delivery date is set",
      first.estimated_delivery_date !== null,
      true,
    );
  }
}