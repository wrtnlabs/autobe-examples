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

export async function test_api_customer_shipments_retrieval_single_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
  // 2. Get shipment details
  const shipment: IPageIEcommerceShipment.ISummary =
    await api.functional.ecommerce.customer.orders.shipments.index(
      customerConnection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "shipped",
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  // 3. Validate shipment data
  typia.assert(shipment);
  // Validate that we have at least one shipment
  TestValidator.predicate("shipment data exists", shipment.data.length > 0);
  // Validate shipment details
  TestValidator.equals(
    "carrier name is correct",
    shipment.data[0].carrier_name,
    "USPS",
  );
  TestValidator.equals(
    "tracking number is correct",
    shipment.data[0].tracking_number,
    "1Z999XX123456789012",
  );
  TestValidator.equals(
    "expected delivery date format",
    shipment.data[0].expected_delivery_date,
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  );
}
