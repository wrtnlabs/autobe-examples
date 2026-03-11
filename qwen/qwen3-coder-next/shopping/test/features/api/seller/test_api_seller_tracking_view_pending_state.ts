import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_tracking_view_pending_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer and seller to set up test context
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = typia.random<IEcommerceMallCustomer.IJoin>();
  await authorize_customer_join(customerConnection, {
    body: customer,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = typia.random<IEcommerceMallSeller.IJoin>();
  await authorize_seller_join(sellerConnection, {
    body: seller,
  });
  // 2. Create an order from customer
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 3. Seller creates shipment without tracking info (both null)
  const shipmentResponse =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          order_items: order.order_items.map((item) => item.id),
          carrier_name: null,
          tracking_number: null,
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipmentResponse);
  // 4. Seller retrieves pending tracking info
  const tracking =
    await api.functional.ecommerceMall.seller.shipments.tracking.at(
      sellerConnection,
      {
        shipmentId: shipmentResponse.id,
      },
    );
  typia.assert(tracking);
  // 5. Validate pending tracking status
  TestValidator.equals("carrier_name is null", tracking.carrier_name, null);
  TestValidator.equals(
    "tracking_number is null",
    tracking.tracking_number,
    null,
  );
}
