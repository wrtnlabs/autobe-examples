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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_seller_product_image_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test update attempt on a non-existing product image for a valid product.
  // Provide valid UUIDs that are not existing in the database.
  // Verify the API returns a 404 Not Found error.
  // Confirm that no image data is altered and proper error messages are returned.
  // Validate path parameter UUID format enforcement.
  // 1. Seller sign-up and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      shopName: "Test Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  // Update headers with token
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "A product for testing",
        product_subcategory_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 1000,
      },
    },
  );
  typia.assert(product);
  // 3. Attempt to update a product image with valid productId but an imageId that does not exist
  const nonExistingImageId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IShoppingMallProductImage.IUpdate = {
    imageUrl: "https://example.com/nonexistent-image.png",
    displayOrder: 1,
  };
  await TestValidator.httpError(
    "update non-existing product image returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.products.images.updateProductImage(
        sellerConnection,
        {
          productId: product.id,
          imageId: nonExistingImageId,
          body: updateBody,
        },
      );
    },
  );
}
