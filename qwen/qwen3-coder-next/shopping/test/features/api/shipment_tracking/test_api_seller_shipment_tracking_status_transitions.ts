import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_tracking_status_transitions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuthorized);
  // 2. Create a shipment using the provided utility function
  // The utility function handles order creation and shipment creation automatically
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  // 3. Retrieve tracking information
  const trackingInfo =
    await api.functional.shoppingMall.seller.shipments.tracking.at(
      sellerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(trackingInfo);
  // 4. Validate status transitions
  // Verify shipped_at timestamp is set (shipment was created successfully)
  TestValidator.notEquals(
    "shipped_at is not null",
    trackingInfo.shippedAt,
    null,
  );
  // Verify customer confirmation is null initially (customer hasn't confirmed yet)
  TestValidator.equals(
    "customer_confirmed_at is null initially",
    trackingInfo.customerConfirmedAt,
    null,
  );
  // Verify auto confirmation is null initially (14 days haven't passed)
  TestValidator.equals(
    "auto_confirmed_at is null initially",
    trackingInfo.autoConfirmedAt,
    null,
  );
  // Verify order relationship exists
  TestValidator.notEquals("order exists", trackingInfo.order, null);
  // Verify seller relationship exists
  TestValidator.notEquals("seller exists", trackingInfo.seller, null);
}
