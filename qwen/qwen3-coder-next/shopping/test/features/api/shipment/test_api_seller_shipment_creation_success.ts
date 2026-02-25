import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials: IShoppingMallSeller.IJoin = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  };
  await authorize_seller_join(sellerConnection, { body: sellerCredentials });
  // 2. Login as seller
  const sellerLogin: IShoppingMallSeller.ILogin = {
    email: sellerCredentials.email,
    password: sellerCredentials.password,
  };
  const sellerAuthorized = await authorize_seller_login(sellerConnection, {
    body: sellerLogin,
  });
  typia.assert(sellerAuthorized);
  // 3. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials: IShoppingMallCustomer.IJoin = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password: "12345678",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com",
    referrer: "https://example.com",
    ip: null,
  };
  await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  // 4. Login as customer
  const customerLogin: IShoppingMallCustomer.ILogin = {
    email: customerCredentials.email,
    password: customerCredentials.password,
    href: "https://example.com",
    referrer: "https://example.com",
  };
  const customerAuthorized = await authorize_customer_login(
    customerConnection,
    {
      body: customerLogin,
    },
  );
  typia.assert(customerAuthorized);
  // 5. Create shipment for the order
  // Create a mock order with required fields for shipment creation
  const order = {
    id: typia.random<string & tags.Format<"uuid">>(),
    items: [
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        status: "paid",
      },
    ],
  };
  // 8. Create shipment for the order
  const shipmentBody: IShoppingMallShipment.ICreate = {
    order_id: order.id,
    tracking_number: `TRK-${RandomGenerator.alphaNumeric(12).toUpperCase()}`,
    tracking_carrier: RandomGenerator.pick([
      "Korea Express",
      "CJ Logistics",
      "Hyundai Logistics",
    ]),
    items: order.items.map((item) => ({
      item_ids: [item.id],
    })),
  };
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: shipmentBody,
    },
  );
  typia.assert(shipment);
  // 9. Validate shipment
  TestValidator.equals(
    "order_id matches",
    shipment.shoppingMallOrderId,
    order.id,
  );
  TestValidator.equals(
    "seller_id matches",
    shipment.shoppingMallSellerId,
    sellerAuthorized.data.profile.id,
  );
  TestValidator.predicate(
    "tracking_number is valid",
    typeof shipment.trackingNumber === "string" &&
      shipment.trackingNumber.length > 0,
  );
  TestValidator.equals(
    "tracking_carrier matches",
    shipment.trackingCarrier,
    shipmentBody.tracking_carrier,
  );
  TestValidator.equals("status is shipped", shipment.status, "shipped");
  TestValidator.predicate(
    "shipped_at is valid date",
    shipment.shippedAt !== null && shipment.shippedAt !== undefined,
  );
  TestValidator.equals(
    "order relationship exists",
    shipment.order.id,
    order.id,
  );
  TestValidator.equals(
    "seller relationship exists",
    shipment.seller.id,
    sellerAuthorized.data.profile.id,
  );
}
