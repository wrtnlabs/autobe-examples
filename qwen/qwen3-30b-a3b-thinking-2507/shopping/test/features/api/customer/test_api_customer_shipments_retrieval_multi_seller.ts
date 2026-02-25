import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipments_retrieval_multi_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 2. Get an order ID (mock for order with multiple seller items)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Request shipments for the order
  const shipments =
    await api.functional.ecommerce.customer.orders.shipments.index(
      customerConnection,
      {
        id: orderId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(shipments);
  // 4. Validate shipment grouping and data
  TestValidator.predicate("multiple shipments", shipments.data.length > 1);
  TestValidator.predicate(
    "shipment 1 has carrier",
    shipments.data[0].carrier_name.length > 0,
  );
  TestValidator.predicate(
    "shipment 1 has tracking number",
    shipments.data[0].tracking_number.length > 0,
  );
  TestValidator.predicate(
    "shipment 2 has carrier",
    shipments.data[1].carrier_name.length > 0,
  );
  TestValidator.predicate(
    "shipment 2 has tracking number",
    shipments.data[1].tracking_number.length > 0,
  );
}
