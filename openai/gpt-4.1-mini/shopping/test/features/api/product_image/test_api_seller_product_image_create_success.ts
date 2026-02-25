import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_seller_products_images_create_image } from "../../../generate/generate_random_shopping_mall_seller_products_images_create_image";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_seller_product_image_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Test the primary success path for a seller to create a new product image for a specific product.
  // The test should ensure proper seller authorization, valid image_url and display_order,
  // and that the API returns the newly created product image with timestamps.
  // Validate display_order and productId association correctness.
  // 1. Seller join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ssw0rd1",
      shopName: "TestShop",
      shopDescription: "Test shop description",
      logoUri: null,
    },
  });
  typia.assert(authorizedSeller);
  sellerConnection.headers = {
    Authorization: authorizedSeller.token.access,
  };
  // 2. Generate a random product ID for the test.
  // Since product creation endpoint is not specified, generate a random UUID for productId.
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare the product image create request body with valid data
  const imageUrl = `https://example.com/images/${RandomGenerator.alphabets(8)}.jpg`;
  const displayOrder = 0;
  const body = {
    image_url: imageUrl,
    display_order: displayOrder,
  } satisfies IShoppingMallProductImage.ICreate;
  // 4. Call the createImage utility function to create the product image
  const createdImage =
    await generate_random_shopping_mall_seller_products_images_create_image(
      sellerConnection,
      {
        params: { productId },
        body: body,
      },
    );
  typia.assert(createdImage);
  // 5. Validate that the response matches the request
  TestValidator.equals(
    "product id matches",
    createdImage.shoppingMallProductId,
    productId,
  );
  TestValidator.equals("image url matches", createdImage.imageUrl, imageUrl);
  TestValidator.equals(
    "display order matches",
    createdImage.displayOrder,
    displayOrder,
  );
  // 6. Validate timestamps are present
  TestValidator.predicate(
    "createdAt timestamp exists",
    typeof createdImage.createdAt === "string" &&
      createdImage.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt timestamp exists",
    typeof createdImage.updatedAt === "string" &&
      createdImage.updatedAt.length > 0,
  );
  // 7. Validate that deletedAt is null
  TestValidator.equals("deletedAt is null", createdImage.deletedAt, null);
}
