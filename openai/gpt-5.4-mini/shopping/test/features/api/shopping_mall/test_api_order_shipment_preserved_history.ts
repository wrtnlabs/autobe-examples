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

export async function test_api_order_shipment_preserved_history(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234!",
      href: "http://localhost",
      referrer: "http://localhost",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipment =
    await api.functional.shoppingMall.customer.orders.shipments.at(
      customerConnection,
      {
        orderId,
        shipmentId,
      },
    );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment id should match requested shipmentId",
    shipment.id,
    shipmentId,
  );
  TestValidator.equals(
    "shipment order id should match requested orderId",
    shipment.order.id,
    orderId,
  );
  TestValidator.predicate(
    "shipment has carrier name",
    shipment.carrierName.length > 0,
  );
  TestValidator.predicate(
    "shipment has tracking number",
    shipment.trackingNumber.length > 0,
  );
  TestValidator.predicate("shipment has status", shipment.status.length > 0);
  TestValidator.predicate(
    "shipment has created timestamp",
    shipment.createdAt.length > 0,
  );
  TestValidator.predicate(
    "shipment has updated timestamp",
    shipment.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "shipment seller summary exists",
    shipment.seller.id.length > 0 && shipment.seller.email.length > 0,
  );
  TestValidator.predicate(
    "shipment seller approval metadata exists",
    shipment.seller.approvalStatus.length > 0 &&
      shipment.seller.accountStatus.length > 0,
  );
  TestValidator.predicate(
    "shipment seller profile exists",
    shipment.seller.sellerProfile.id.length > 0 &&
      shipment.seller.sellerProfile.shopName.length > 0,
  );
  TestValidator.predicate(
    "shipment order summary exists",
    shipment.order.order_number.length > 0 && shipment.order.total_amount >= 0,
  );
  TestValidator.predicate(
    "shipment order monetary fields exist",
    shipment.order.subtotal_amount >= 0 &&
      shipment.order.shipping_fee_amount >= 0 &&
      shipment.order.discount_amount >= 0,
  );
  TestValidator.predicate(
    "shipment shipping address can be absent or summarized",
    shipment.order.shippingAddress === null ||
      shipment.order.shippingAddress.id.length > 0,
  );
}
