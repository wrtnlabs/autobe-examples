import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
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

export async function test_api_seller_product_images_reorder_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // Test that a seller cannot reorder product images of another seller's product.
  // Attempt to reorder images for a product that belongs to a different seller while authenticated as another seller.
  // Validate an authorization failure or forbidden error is returned to prevent unauthorized image reordering.
  // 1. Authenticate first seller by joining
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Authorized = await authorize_seller_join(seller1Connection, {
    body: {},
  });
  seller1Connection.headers ??= {};
  seller1Connection.headers.Authorization = seller1Authorized.token.access;
  // 2. Create a product as the first seller
  const product = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    { body: {} },
  );
  typia.assert(product);
  // 3. Add multiple images to the first seller's product
  const imageCount = 3;
  const images: IShoppingMallProductImage[] = [];
  for (let i = 0; i < imageCount; ++i) {
    const image =
      await generate_random_shopping_mall_seller_products_images_create_image(
        seller1Connection,
        { params: { productId: product.id }, body: {} },
      );
    typia.assert(image);
    images.push(image);
  }
  // 4. Authenticate second seller by joining
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Authorized = await authorize_seller_join(seller2Connection, {
    body: {},
  });
  seller2Connection.headers ??= {};
  seller2Connection.headers.Authorization = seller2Authorized.token.access;
  // 5. Prepare reorder body with updated display orders for the images
  // Despite Seller1 owns the product and images, Seller2 tries to reorder
  const reorderBodyItems: IShoppingMallProductImage.IUpdateOrderItem[] =
    images.map((img, index) => ({
      id: img.id,
      display_order: imageCount - index - 1, // reverse order
    }));
  // 6. Attempt to reorder images of Seller1's product by Seller2
  await TestValidator.httpError(
    "seller2 cannot reorder images of seller1's product",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.images.order.updateImageOrder(
        seller2Connection,
        {
          productId: product.id,
          body: {
            items: reorderBodyItems,
          },
        },
      );
    },
  );
}
