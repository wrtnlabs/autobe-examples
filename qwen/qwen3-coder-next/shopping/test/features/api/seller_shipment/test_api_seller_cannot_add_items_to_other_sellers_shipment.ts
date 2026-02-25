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

/**
 * Test that sellers cannot add items to shipments belonging to other sellers.
 * This validates the security constraint that sellers can only modify shipments they own.
 * 1. Create first seller and their shipment
 * 2. Create second seller
 * 3. Attempt second seller to add items to first seller's shipment (should fail)
 * 4. Verify first seller can still access their shipment
 */
export async function test_api_seller_cannot_add_items_to_other_sellers_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first seller connection and shipment
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1: IShoppingMallSeller.IAuthorized =
    await api.functional.shoppingMall.auth.seller.join(seller1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: `Seller1 Shop ${RandomGenerator.name()}`,
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller1);
  // Update seller1 connection headers with token
  seller1Connection.headers = {
    ...seller1Connection.headers,
    Authorization: seller1.token.access,
  };
  // Create seller1's shipment
  const shipment1: IShoppingMallShipment =
    await api.functional.shoppingMall.seller.shipments.create(
      seller1Connection,
      {
        body: typia.random<IShoppingMallShipment.ICreate>(),
      },
    );
  typia.assert(shipment1);
  // 2. Create second seller connection
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2: IShoppingMallSeller.IAuthorized =
    await api.functional.shoppingMall.auth.seller.join(seller2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: `Seller2 Shop ${RandomGenerator.name()}`,
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller2);
  // Update seller2 connection headers with token
  seller2Connection.headers = {
    ...seller2Connection.headers,
    Authorization: seller2.token.access,
  };
  // 3. Second seller attempts to add items to first seller's shipment (should fail)
  await TestValidator.error(
    "seller2 cannot add items to seller1's shipment",
    async () => {
      await api.functional.shoppingMall.seller.shipments.items.addItems(
        seller2Connection,
        {
          shipmentId: shipment1.id,
          body: {
            item_ids: [typia.random<string & tags.Format<"uuid">>()],
          } satisfies IShoppingMallShipment.ICreateItem,
        },
      );
    },
  );
  // 4. Verify first seller can still access their shipment
  const verifiedShipment1: IShoppingMallShipment.ISummary =
    await api.functional.shoppingMall.seller.shipments.items.addItems(
      seller1Connection,
      {
        shipmentId: shipment1.id,
        body: {
          item_ids: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IShoppingMallShipment.ICreateItem,
      },
    );
  typia.assert(verifiedShipment1);
}
