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
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
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

export async function test_api_seller_shipment_creation_multi_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as first seller
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `Seller1 Shop ${RandomGenerator.name()}`,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller1);
  // 2. Register and login as second seller
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `Seller2 Shop ${RandomGenerator.name()}`,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller2);
  // 3. Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 4. Create order with items from both sellers
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 5. Get order items for seller 1
  const seller1ItemsResponse =
    await api.functional.ecommerceMall.seller.orders.items.at(
      seller1Connection,
      { orderId: order.id },
    );
  typia.assert(seller1ItemsResponse);
  const seller1Items = seller1ItemsResponse.data;
  // 6. Get order items for seller 2
  const seller2ItemsResponse =
    await api.functional.ecommerceMall.seller.orders.items.at(
      seller2Connection,
      { orderId: order.id },
    );
  typia.assert(seller2ItemsResponse);
  const seller2Items = seller2ItemsResponse.data;
  // 7. Verify we have items from both sellers
  TestValidator.equals("seller1 has items", seller1Items.length > 0, true);
  TestValidator.equals("seller2 has items", seller2Items.length > 0, true);
  TestValidator.notEquals(
    "different sellers",
    seller1Items[0].seller.id,
    seller2Items[0].seller.id,
  );
  // 8. Seller 1 creates shipment
  const shipment1 =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      seller1Connection,
      {
        orderId: order.id,
        body: {
          order_items: seller1Items.map((item) => item.id),
          carrier_name: "Kuroneko Yamato",
          tracking_number: `TRACK-${RandomGenerator.alphaNumeric(10)}`,
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment1);
  // 9. Seller 2 creates shipment
  const shipment2 =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      seller2Connection,
      {
        orderId: order.id,
        body: {
          order_items: seller2Items.map((item) => item.id),
          carrier_name: "Yuunyu",
          tracking_number: `TRACK-${RandomGenerator.alphaNumeric(10)}`,
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment2);
  // 10. Verify shipments contain only respective seller's items
  TestValidator.equals(
    "shipment1 seller id",
    shipment1.seller.id,
    seller1Items[0].seller.id,
  );
  TestValidator.equals(
    "shipment2 seller id",
    shipment2.seller.id,
    seller2Items[0].seller.id,
  );
  // 11. Verify tracking information
  TestValidator.equals(
    "shipment1 carrier",
    shipment1.carrier_name,
    "Kuroneko Yamato",
  );
  TestValidator.equals("shipment2 carrier", shipment2.carrier_name, "Yuunyu");
  TestValidator.predicate(
    "shipment1 has tracking",
    () => shipment1.tracking_number !== null,
  );
  TestValidator.predicate(
    "shipment2 has tracking",
    () => shipment2.tracking_number !== null,
  );
}
