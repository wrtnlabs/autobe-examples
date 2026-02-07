import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test unauthorized image reordering scenarios for shopping mall products.
 * Tests various unauthorized access attempts to the image reordering endpoint.
 */
export async function test_api_product_image_reorder_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: seller.token.access,
  };
  // 2. Test unauthorized access - non-existent product ID
  await TestValidator.error("non-existent product ID should fail", async () => {
    await api.functional.shoppingMall.products.images.reorder(
      sellerConnection,
      {
        productId: "00000000-0000-0000-0000-000000000000",
        body: [
          {
            image_id: "11111111-1111-1111-1111-111111111111",
            display_order: 1,
          } satisfies IShoppingMallProductImage.IOrder,
        ],
      },
    );
  });
  // 3. Register second seller account for cross-seller access test
  const anotherSellerConnection: api.IConnection = { host: connection.host };
  const anotherSeller = await authorize_seller_join(anotherSellerConnection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(anotherSeller);
  anotherSellerConnection.headers = {
    ...anotherSellerConnection.headers,
    Authorization: anotherSeller.token.access,
  };
  // 4. Test cross-seller access - second seller tries to reorder first seller's non-existent product
  // Since we can't create products, we use a non-existent product ID
  await TestValidator.error(
    "cross-seller product access should fail",
    async () => {
      await api.functional.shoppingMall.products.images.reorder(
        anotherSellerConnection,
        {
          productId: "22222222-2222-2222-2222-222222222222",
          body: [
            {
              image_id: "33333333-3333-3333-3333-333333333333",
              display_order: 2,
            } satisfies IShoppingMallProductImage.IOrder,
          ],
        },
      );
    },
  );
  // 5. Test invalid product ID format
  await TestValidator.error(
    "invalid product ID format should fail",
    async () => {
      await api.functional.shoppingMall.products.images.reorder(
        sellerConnection,
        {
          productId: "not-a-valid-uuid",
          body: [
            {
              image_id: "44444444-4444-4444-4444-444444444444",
              display_order: 3,
            } satisfies IShoppingMallProductImage.IOrder,
          ],
        },
      );
    },
  );
}
