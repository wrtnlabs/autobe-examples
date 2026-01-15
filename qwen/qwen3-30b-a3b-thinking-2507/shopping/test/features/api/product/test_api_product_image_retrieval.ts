import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
export async function test_api_product_image_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate random product code and image code
  const productCode = typia.random<string>();
  const imageCode = typia.random<string>();
  // Call the endpoint to get the product image
  const image: IShoppingMallProductImage =
    await api.functional.shoppingMall.products.images.at(connection, {
      productCode,
      imageCode,
    });
  // Validate the image using typia.assert
  typia.assert(image);
  // Validate that image details are correctly returned
  TestValidator.equals("image id is defined", image.id, image.id);
  TestValidator.equals(
    "image dimensions exist",
    image.dimensions,
    image.dimensions,
  );
  TestValidator.predicate(
    "image position is a non-negative integer",
    image.position >= 0,
  );
  // Validate product association
  TestValidator.equals(
    "product id matches",
    image.product.id,
    image.product.id,
  );
  TestValidator.equals(
    "product name is defined",
    image.product.name,
    image.product.name,
  );
}
