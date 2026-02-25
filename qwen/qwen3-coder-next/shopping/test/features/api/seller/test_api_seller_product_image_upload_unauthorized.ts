import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
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
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_seller_product_image_upload_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller A and login
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerAConnection,
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
  typia.assert(sellerA);
  // 2. Create product by seller A
  const category: IShoppingMallCategory.ISummary =
    typia.random<IShoppingMallCategory.ISummary>();
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerAConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.content({ paragraphs: 5 }),
          shopping_mall_category_id: category.id,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.MultipleOf<0.01>
          >(),
          images: [
            {
              image_url: typia.random<string & tags.Format<"uri">>(),
              sort_order: 0,
            } satisfies IShoppingMallProductImage.ICreate,
          ],
          variants: [
            {
              sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
              option_values: [
                {
                  option_name: "size",
                  option_value: "L",
                } satisfies IShoppingMallProductVariantOptionValue.ICreate,
              ],
              stock_quantity: 100,
            } satisfies IShoppingMallProductVariant.ICreate,
          ],
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 3. Create seller B and login
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerBConnection,
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
  typia.assert(sellerB);
  // 4. Seller B tries to upload images to seller A's product - should fail
  await TestValidator.error(
    "seller B cannot upload to seller A's product",
    async () => {
      await api.functional.shoppingMall.seller.products.images.upload(
        sellerBConnection,
        {
          productId: product.id,
        },
      );
    },
  );
}
