import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_image_reorder_foreign_image_rejected(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller_${typia.random<string & tags.Format<"uuid">>()}@example.com`,
      password: "password123!",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const targetProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(targetProduct);
  const foreignProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(foreignProduct);
  TestValidator.predicate(
    "target product should have images",
    targetProduct.images.length > 0,
  );
  TestValidator.predicate(
    "foreign product should have images",
    foreignProduct.images.length > 0,
  );
  const originalOrder = targetProduct.images.map((image) => image.id);
  const foreignImage = foreignProduct.images[0];
  const targetImage = targetProduct.images[0];
  await TestValidator.error(
    "foreign image membership should be rejected",
    async () => {
      await api.functional.shoppingMall.products.images.update(
        sellerConnection,
        {
          productId: targetProduct.id,
          body: {
            imageUri: foreignImage.imageUri,
            displayOrder: targetImage.displayOrder,
          } satisfies IShoppingMallProductImage.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "target image order should remain unchanged after rejected update",
    originalOrder,
    targetProduct.images.map((image) => image.id),
  );
}
