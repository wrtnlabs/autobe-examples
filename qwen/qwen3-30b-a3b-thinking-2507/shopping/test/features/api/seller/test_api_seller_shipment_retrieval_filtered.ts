import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipment_retrieval_filtered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create test data and filter API call
  const orderID: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const shipments =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        id: orderID,
        body: {
          status: "shipped",
          carrierName: "USPS",
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(shipments);
  // 3. Verify response contains exactly the filtered shipments
  TestValidator.equals(
    "Responses should contain exactly the filtered shipments",
    shipments.data.length,
    1,
  );
  // 4. Validate shipment details
  const firstShipment: IEcommerceShipment.ISummary = shipments.data[0];
  TestValidator.equals(
    'Shipment status should be "shipped"',
    firstShipment.status,
    "shipped",
  );
  TestValidator.equals(
    'Shipment carrier should be "USPS"',
    firstShipment.carrier_name,
    "USPS",
  );
  typia.assert(firstShipment);
}
