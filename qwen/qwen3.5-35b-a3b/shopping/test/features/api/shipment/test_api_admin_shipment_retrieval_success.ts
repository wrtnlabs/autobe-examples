import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_admin_shipment_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoined: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: typia.random<IEcommerceMallSeller.IJoin>(),
    });
  typia.assert(sellerJoined);
  // Step 2: Seller logs in
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoggedIn: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_login(sellerLoginConnection, {
      body: {
        email: sellerJoined.email,
        password: sellerJoined.token.access,
      } satisfies IEcommerceMallSeller.ILogin,
    });
  typia.assert(sellerLoggedIn);
  // Step 3: Admin joins
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoined: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: typia.random<IEcommerceMallAdmin.IJoin>(),
    });
  typia.assert(adminJoined);
  // Step 4: Admin logs in
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoggedIn: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_login(adminLoginConnection, {
      body: {
        email: adminJoined.email,
        password: adminJoined.token.access,
      } satisfies IEcommerceMallAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);
  // Step 5: Seller creates shipment
  // Note: order_item_ids are random UUIDs since order creation API is not available
  const orderItemIds: (string & tags.Format<"uuid">)[] = ArrayUtil.repeat(
    1,
    () => typia.random<string & tags.Format<"uuid">>(),
  );
  const shipment: IEcommerceMallShipment =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerLoginConnection,
      {
        body: {
          order_item_ids: orderItemIds,
          carrier_name: RandomGenerator.name(),
          carrier_phone: RandomGenerator.mobile(),
          carrier_website: typia.random<
            string & tags.Format<"uri"> & tags.MaxLength<80000>
          >(),
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 6: Admin retrieves shipment
  const retrievedShipment: IEcommerceMallShipment =
    await api.functional.ecommerceMall.admin.shipments.at(
      adminLoginConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(retrievedShipment);
  // Step 7: Validate shipment data
  TestValidator.equals(
    "shipment id matches",
    retrievedShipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "carrier name matches",
    retrievedShipment.carrierName,
    shipment.carrierName,
  );
  TestValidator.equals(
    "carrier phone matches",
    retrievedShipment.carrierPhone,
    shipment.carrierPhone,
  );
  TestValidator.equals(
    "carrier website matches",
    retrievedShipment.carrierWebsite,
    shipment.carrierWebsite,
  );
  TestValidator.equals(
    "status matches",
    retrievedShipment.status,
    shipment.status,
  );
  TestValidator.equals(
    "shipped at matches",
    retrievedShipment.shippedAt,
    shipment.shippedAt,
  );
  TestValidator.equals(
    "delivered at matches",
    retrievedShipment.deliveredAt,
    shipment.deliveredAt,
  );
  TestValidator.equals(
    "estimated delivery at matches",
    retrievedShipment.estimatedDeliveryAt,
    shipment.estimatedDeliveryAt,
  );
  TestValidator.equals(
    "delivery address matches",
    retrievedShipment.deliveryAddress,
    shipment.deliveryAddress,
  );
  TestValidator.equals(
    "created at matches",
    retrievedShipment.createdAt,
    shipment.createdAt,
  );
  TestValidator.equals(
    "updated at matches",
    retrievedShipment.updatedAt,
    shipment.updatedAt,
  );
  TestValidator.equals(
    "order id matches",
    retrievedShipment.order.id,
    shipment.order.id,
  );
  TestValidator.equals(
    "order number matches",
    retrievedShipment.order.order_number,
    shipment.order.order_number,
  );
  TestValidator.equals(
    "order total price matches",
    retrievedShipment.order.total_price,
    shipment.order.total_price,
  );
  TestValidator.equals(
    "order status matches",
    retrievedShipment.order.status,
    shipment.order.status,
  );
  TestValidator.equals(
    "order created at matches",
    retrievedShipment.order.created_at,
    shipment.order.created_at,
  );
  TestValidator.equals(
    "seller id matches",
    retrievedShipment.seller.id,
    shipment.seller.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedShipment.seller.email,
    shipment.seller.email,
  );
  TestValidator.equals(
    "seller status matches",
    retrievedShipment.seller.status,
    shipment.seller.status,
  );
}
