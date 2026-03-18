import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_shipment_detail_by_customer(
  connection: api.IConnection,
): Promise<void> {
  const shipment =
    await api.functional.shoppingMall.customer.orders.shipments.at(connection, {
      orderId: typia.random<string & tags.Format<"uuid">>(),
      shipmentId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(shipment);
  TestValidator.predicate(
    "shipment carrier name exists",
    shipment.carrierName.length > 0,
  );
  TestValidator.predicate(
    "shipment tracking number exists",
    shipment.trackingNumber.length > 0,
  );
  TestValidator.predicate("shipment has status", shipment.status.length > 0);
  TestValidator.predicate(
    "shipment has createdAt",
    shipment.createdAt.length > 0,
  );
  TestValidator.predicate(
    "shipment has updatedAt",
    shipment.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "shipment has order summary",
    shipment.order.id.length > 0,
  );
  TestValidator.predicate(
    "shipment has seller summary",
    shipment.seller.id.length > 0,
  );
  await TestValidator.httpError(
    "shipment under wrong order should not be found",
    404,
    async () => {
      await api.functional.shoppingMall.customer.orders.shipments.at(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
