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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_seller_product_images_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Unauthorized seller tries to update images of a product that they do NOT own
  // 1. Create Seller A account and log in
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ssw0rd1",
      shopName: RandomGenerator.name(),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerA);
  // 2. Create Seller B account and log in
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ssw0rd2",
      shopName: RandomGenerator.name(),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerB);
  // 3. Seller B creates a product
  const productCreatedByB =
    await generate_random_shopping_mall_seller_products_create(
      sellerBConnection,
      {
        body: undefined,
      },
    );
  typia.assert(productCreatedByB);
  // 4. Seller A attempts to update images of Seller B's product
  const productId = productCreatedByB.id;
  // Prepare some sample images update request body
  const updateImagesBody = {
    id: undefined,
    imageUrl: `https://example.com/product-image-${RandomGenerator.alphabets(5)}.jpg`,
    displayOrder: 0,
  } satisfies IShoppingMallProductImage.IRequest;
  // Try updating images as Seller A on Seller B's product which should be unauthorized
  await TestValidator.httpError(
    "should reject unauthorized update attempt",
    401,
    async () => {
      await api.functional.shoppingMall.seller.products.images.updateImages(
        sellerAConnection,
        {
          productId,
          body: updateImagesBody,
        },
      );
    },
  );
}
