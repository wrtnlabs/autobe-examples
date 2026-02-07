import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shipment_delivery_confirmation_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {} satisfies IShoppingMallCustomer.IJoin,
    });
  // Generate a random shipment ID
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // First confirmation: Should succeed (transition from 'shipped' to 'delivered')
  const firstDelivery =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.invert(
      customerConnection,
      { shipmentId },
    );
  typia.assert(firstDelivery);
  // Second confirmation attempt: Should fail with 400 error (already delivered)
  await TestValidator.error("duplicate delivery confirmation", async () => {
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.invert(
      customerConnection,
      { shipmentId },
    );
  });
}
