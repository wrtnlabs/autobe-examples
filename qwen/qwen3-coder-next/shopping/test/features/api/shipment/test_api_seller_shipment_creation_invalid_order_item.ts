import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_creation_invalid_order_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account (authorizationActor: seller)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Attempt to create a shipment for an order item that doesn't exist
  const invalidOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should reject invalid order item reference",
    async () => {
      await api.functional.shoppingMall.seller.seller.shipments.create(
        sellerConnection,
        {
          body: {
            order_item_id: invalidOrderItemId,
          } satisfies IShoppingMallShipment.ICreate,
        },
      );
    },
  );
  // 3. Verify no shipment record was created (check database directly)
  // Note: In a real test suite, we would verify the database to ensure
  // no shipment record was created. This would typically involve a Prisma
  // query to check that no record exists in the shopping_mall_shipments table
  // with the invalid order_item_id.
}
