import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test seller product images retrieval at success and not found cases.
 *
 * 1. Authenticate seller by joining.
 * 2. Create a product.
 * 3. Upload product image.
 * 4. Retrieve product image by valid IDs and validate fields.
 * 5. Test retrieval failure on non-existent imageId and productId with 404 errors.
 */
export async function test_api_seller_product_images_at_success_and_not_found_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller (join)
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = Object.assign({}, sellerConnection.headers, {
    Authorization: authorized.token.access,
  });
  // 2. Create a new product
  const productRaw = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  const product = typia.assert(productRaw) as IShoppingMallProduct & { id: string };
  // 3. Upload an image for the created product
  const imageRaw =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id }, body: {} },
    );
  const image = typia.assert(imageRaw) as IShoppingMallProductImage & {
    id: string;
    shopping_mall_product_id: string;
    image_url: string;
    display_order: number;
    created_at: string;
    updated_at: string;
    deleted_at: null;
  };
  // Scenario 1: Successfully retrieve the product image details
  const fetchedRawImage =
    await api.functional.shoppingMall.seller.products.images.at(
      sellerConnection,
      { productId: product.id, imageId: image.id },
    );
  const fetchedImage = typia.assert(fetchedRawImage) as typeof image;
  TestValidator.equals("image id matches", fetchedImage.id, image.id);
  TestValidator.equals(
    "product id matches",
    fetchedImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.predicate(
    "image url is non-empty string",
    typeof fetchedImage.image_url === "string" &&
      fetchedImage.image_url.length > 0,
  );
  TestValidator.predicate(
    "display order is number",
    typeof fetchedImage.display_order === "number",
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof fetchedImage.created_at === "string" &&
      !isNaN(Date.parse(fetchedImage.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof fetchedImage.updated_at === "string" &&
      !isNaN(Date.parse(fetchedImage.updated_at)),
  );
  TestValidator.predicate(
    "deleted_at is null",
    fetchedImage.deleted_at === null,
  );
  // Scenario 2: Attempt to retrieve image with non-existent imageId
  const nonExistentImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent image id returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.products.images.at(
        sellerConnection,
        {
          productId: product.id,
          imageId: nonExistentImageId,
        },
      );
    },
  );
  // Scenario 3: Attempt to retrieve image with non-existent productId
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent product id returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.products.images.at(
        sellerConnection,
        {
          productId: nonExistentProductId,
          imageId: image.id,
        },
      );
    },
  );
}
