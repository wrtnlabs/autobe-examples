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

export async function test_api_admin_shipment_update_delivery_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and authenticate
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminTest123!",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  const adminAuth = await authorize_admin_join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Seller setup - create seller account and authenticate
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerTest123!",
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAuth = await authorize_seller_join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinBody.email,
      password: sellerJoinBody.password,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Seller creates a shipment with carrier tracking info
  const shipmentBody: IEcommerceMallShipment.ICreate = {
    order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
    carrier_name: "FedEx",
    carrier_phone: "1-800-GO-FEDEX",
    carrier_website: "https://www.fedex.com",
    delivery_address: "123 Initial Street, Seoul, Korea",
  } satisfies IEcommerceMallShipment.ICreate;
  const originalShipment =
    await api.functional.ecommerceMall.seller.shipments.create(
      sellerConnection,
      { body: shipmentBody },
    );
  typia.assert(originalShipment);
  const originalCreatedAt = originalShipment.createdAt;
  const originalUpdatedAt = originalShipment.updatedAt;
  const originalStatus = originalShipment.status;
  const originalCarrierName = originalShipment.carrierName;
  const originalCarrierPhone = originalShipment.carrierPhone;
  const originalCarrierWebsite = originalShipment.carrierWebsite;
  const originalDeliveryAddress = originalShipment.deliveryAddress;
  // 4. Admin updates the delivery address
  const newDeliveryAddress = "456 New Address Avenue, Busan, Korea";
  const updatedShipment =
    await api.functional.ecommerceMall.admin.shipments.update(adminConnection, {
      shipmentId: originalShipment.id,
      body: {
        delivery_address: newDeliveryAddress,
      } satisfies IEcommerceMallShipment.IUpdate,
    });
  typia.assert(updatedShipment);
  // 5. Validate the update operation
  TestValidator.equals(
    "delivery address updated",
    updatedShipment.deliveryAddress,
    newDeliveryAddress,
  );
  TestValidator.equals(
    "carrier name unchanged",
    updatedShipment.carrierName,
    originalCarrierName,
  );
  TestValidator.equals(
    "carrier phone unchanged",
    updatedShipment.carrierPhone,
    originalCarrierPhone,
  );
  TestValidator.equals(
    "carrier website unchanged",
    updatedShipment.carrierWebsite,
    originalCarrierWebsite,
  );
  TestValidator.equals(
    "status unchanged",
    updatedShipment.status,
    originalStatus,
  );
  TestValidator.notEquals(
    "updated_at modified",
    originalUpdatedAt,
    updatedShipment.updatedAt,
  );
  TestValidator.equals(
    "created_at unchanged",
    originalCreatedAt,
    updatedShipment.createdAt,
  );
  TestValidator.equals(
    "order reference unchanged",
    updatedShipment.order.id,
    originalShipment.order.id,
  );
  TestValidator.equals(
    "seller reference unchanged",
    updatedShipment.seller.id,
    originalShipment.seller.id,
  );
}
