import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_image_upload_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create active product
  const productBase = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    base_price: typia.random<number & tags.Minimum<0.01>>(),
  } satisfies IShoppingMallProduct.ICreate;
  const createdProduct =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: productBase,
    });
  typia.assert(createdProduct);
  // 3. Soft-delete the product (is_deleted = true)
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: createdProduct.id,
  });
  // 4. Attempt to upload image to deleted product (expect 404)
  const imageUrl = "https://example.com/image.jpg" satisfies string &
    tags.Format<"uri">;
  await TestValidator.httpError(
    "should reject image upload to deleted product",
    404,
    async () => {
      await api.functional.shoppingMall.seller.products.images.create(
        sellerConnection,
        {
          productId: createdProduct.id,
          body: {
            image_url: imageUrl,
          } satisfies IShoppingMallProductImage.IUpload,
        },
      );
    },
  );
}
