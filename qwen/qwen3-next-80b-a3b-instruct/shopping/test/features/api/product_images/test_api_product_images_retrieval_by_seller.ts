import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
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

export async function test_api_product_images_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerResponse = await authorize_seller_join(sellerConnection, {
    body: joinInput,
  });
  typia.assert(sellerResponse);
  // 2. Seller login (using original password, not token)
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: joinInput.email,
      password: joinInput.password,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Create product with 5 ordered images
  const imageUrls: string[] = ArrayUtil.repeat(
    5,
    () => `https://example.com/images/${RandomGenerator.alphaNumeric(8)}.jpg`,
  );
  const product = await generate_random_shopping_mall_seller_products_create(
    approvedSellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<number & tags.Minimum<0.01>>(),
        images: imageUrls,
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            price: typia.random<number & tags.Minimum<0>>(),
            options: [
              {
                option_name: "Color",
                option_value: RandomGenerator.name(1),
              },
            ],
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Retrieve product images via direct SDK call (no utility available)
  const imagesResponse =
    await api.functional.shoppingMall.products.images.search(
      approvedSellerConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(imagesResponse);
  // 5. Validate response structure and order
  TestValidator.equals(
    "pagination current",
    imagesResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", imagesResponse.pagination.limit, 10);
  TestValidator.equals(
    "pagination records",
    imagesResponse.pagination.records,
    5,
  );
  TestValidator.equals("pagination pages", imagesResponse.pagination.pages, 1);
  TestValidator.equals("image count", imagesResponse.data.length, 5);
  // Validate image order matches uploaded sequence
  for (let i = 0; i < imagesResponse.data.length; i++) {
    TestValidator.equals(
      `image ${i} url`,
      imagesResponse.data[i].image_url,
      imageUrls[i],
    );
    TestValidator.equals(
      `image ${i} position`,
      imagesResponse.data[i].position,
      i,
    );
  }
}
