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

export async function test_api_seller_product_image_delete_by_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authorize first seller
  const sellerOneConnection: api.IConnection = { host: connection.host };
  const sellerOneAuthorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerOneConnection, { body: {} });
  sellerOneConnection.headers = {
    Authorization: sellerOneAuthorized.token.access,
  };
  // 2. Create product by first seller
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerOneConnection,
      { body: {} },
    );
  typia.assert(product);
  // 3. Upload an image for that product
  const productImage: IShoppingMallProductImage =
    await generate_random_shopping_mall_seller_products_images_create_image(
      sellerOneConnection,
      { params: { productId: product.id }, body: {} },
    );
  typia.assert(productImage);
  // 4. Create and authorize second seller independently
  const sellerTwoConnection: api.IConnection = { host: connection.host };
  const sellerTwoAuthorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerTwoConnection, { body: {} });
  sellerTwoConnection.headers = {
    Authorization: sellerTwoAuthorized.token.access,
  };
  // 5. Try deleting the first seller's product image with second seller
  await TestValidator.httpError(
    "deletion attempt by non-owner should be forbidden",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        sellerTwoConnection,
        {
          productId: product.id,
          imageId: productImage.id,
        },
      );
    },
  );
  // 6. Verify the product image still exists by deleting with owner and expect no error
  await TestValidator.predicate(
    "image should still exist after failed non-owner deletion",
    async () => {
      await api.functional.shoppingMall.seller.products.images.erase(
        sellerOneConnection,
        {
          productId: product.id,
          imageId: productImage.id,
        },
      );
      // If reached here, deletion successful, meaning image existed
      return true;
    },
  );
}
