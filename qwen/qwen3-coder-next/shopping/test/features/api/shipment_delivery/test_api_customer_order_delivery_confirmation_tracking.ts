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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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

export async function test_api_customer_order_delivery_confirmation_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account for shipping
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = typia.random<IEcommerceMallSeller.IJoin>();
  const seller = await authorize_seller_join(sellerConnection, {
    body: sellerData,
  });
  typia.assert(seller);
  // 2. Create customer account for ordering
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = typia.random<IEcommerceMallCustomer.IJoin>();
  const customer = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(customer);
  // 3. Customer creates order (simulated - use random data)
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 4. Seller creates shipment for the order
  const shipmentData: IEcommerceMallShipment.ICreate = {
    order_items: [typia.random<string & tags.Format<"uuid">>()],
    carrier_name: "Kuroneko Yamato",
    tracking_number: RandomGenerator.alphaNumeric(12),
  };
  const shipment =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: order.id,
        body: shipmentData,
      },
    );
  typia.assert(shipment);
  // 5. Customer views shipment details
  const shipmentsPage =
    await api.functional.ecommerceMall.customer.orders.shipments.index(
      customerConnection,
      {
        orderId: order.id,
      },
    );
  typia.assert(shipmentsPage);
  TestValidator.predicate("shipment exists", shipmentsPage.data.length > 0);
  // 6. Verify shipment details match what was created
  const firstShipment = shipmentsPage.data[0];
  TestValidator.equals(
    "tracking number matches",
    firstShipment.tracking_number,
    shipmentData.tracking_number,
  );
  TestValidator.equals(
    "carrier name matches",
    firstShipment.carrier_name,
    shipmentData.carrier_name,
  );
  TestValidator.predicate(
    "seller information exists",
    firstShipment.seller.id !== undefined,
  );
  // 7. Verify shipment structure includes all required fields
  TestValidator.equals("shipment has id", firstShipment.id !== undefined, true);
  TestValidator.equals(
    "shipment has created_at",
    firstShipment.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "shipment has seller",
    firstShipment.seller !== undefined,
    true,
  );
}
