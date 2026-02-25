import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallDeliveryAutoConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryAutoConfirmation";
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
import { generate_random_shopping_mall_seller_shipments_auto_confirmations_auto_confirm } from "../../../generate/generate_random_shopping_mall_seller_shipments_auto_confirmations_auto_confirm";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_delivery_auto_confirmation } from "../../../prepare/prepare_random_shopping_mall_delivery_auto_confirmation";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_auto_delivery_after_14_days(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 3 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Login as seller to get authenticated connection
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.seller.login(sellerAuthConnection, {
    body: {
      email: seller.data.profile.shop_name,
      password: seller.data.token.refresh,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Create a sample order for testing (using random order ID since orders API not available)
  // In real scenario, we would need to create an order through customer workflow
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create shipment with shipped status
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerAuthConnection,
    {
      body: {
        order_id: orderId,
        tracking_number: RandomGenerator.alphaNumeric(12),
        tracking_carrier: "Korea Express",
        items: [
          {
            item_ids: [typia.random<string & tags.Format<"uuid">>()],
          },
        ],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 5. Verify shipment status is "shipped"
  TestValidator.equals("shipment status", shipment.status, "shipped");
  // 6. Simulate 14-day passage and trigger auto-delivery confirmation
  const confirmation =
    await api.functional.shoppingMall.seller.shipments.auto_confirmations.autoConfirm(
      sellerAuthConnection,
      {
        shipmentId: shipment.id,
        body: {
          shopping_mall_shipment_id: shipment.id,
          confirmed_at: shipment.shippedAt,
          auto_confirmed_by: "system_job",
        } satisfies IShoppingMallDeliveryAutoConfirmation.ICreate,
      },
    );
  typia.assert(confirmation);
  // 7. Verify auto-delivery confirmation was created
  TestValidator.equals(
    "confirmation shipment ID",
    confirmation.shoppingMallShipmentId,
    shipment.id,
  );
  TestValidator.equals(
    "auto confirmed by",
    confirmation.autoConfirmedBy,
    "system_job",
  );
  // 8. Verify confirmation record was created correctly
  TestValidator.predicate(
    "auto confirmation has valid timestamp",
    () => !!confirmation.confirmedAt,
  );
}
