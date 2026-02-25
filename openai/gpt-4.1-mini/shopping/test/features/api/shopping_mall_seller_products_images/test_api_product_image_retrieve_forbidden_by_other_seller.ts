import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
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
import { generate_random_shopping_mall_seller_products_images_create_image } from "../../../generate/generate_random_shopping_mall_seller_products_images_create_image";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_image_retrieve_forbidden_by_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // Test unauthorized access to product image retrieval with a different seller who does not own the product.
  // 1. Register and authenticate the first seller
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "firstSellerPass123",
      shopName: "First Seller Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(firstSeller);
  // 2. Create a product owned by the first seller
  const product = await generate_random_shopping_mall_seller_products_create(
    firstSellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a product image for the product by the first seller
  const productImage =
    await generate_random_shopping_mall_seller_products_images_create_image(
      firstSellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(productImage);
  // 4. Register and authenticate the second seller
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSeller = await authorize_seller_join(secondSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secondSellerPass123",
      shopName: "Second Seller Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(secondSeller);
  // 5. Attempt to retrieve the first seller's product image using the second seller's connection
  await TestValidator.httpError(
    "attempt unauthorized product image access by other seller",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.images.at(
        secondSellerConnection,
        {
          productId: product.id,
          imageId: productImage.id,
        },
      );
    },
  );
}
