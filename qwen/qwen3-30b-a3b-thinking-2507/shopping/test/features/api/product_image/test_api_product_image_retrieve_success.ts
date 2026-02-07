import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_image_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve product image
  const retrievedImage = await api.functional.ecommerce.products.images.at(
    connection,
    {
      productId: typia.random<string & tags.Format<"uuid">>(),
      imageId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(retrievedImage);
  // Validate all details
  TestValidator.notEquals("image URL not empty", retrievedImage.image_url, "");
  TestValidator.equals(
    "image URL format",
    retrievedImage.image_url.startsWith("https://"),
    true,
  );
  TestValidator.equals(
    "created_at valid timestamp",
    retrievedImage.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "updated_at valid timestamp",
    retrievedImage.updated_at.length > 0,
    true,
  );
  // Product details validation
  TestValidator.equals(
    "product ID present",
    retrievedImage.product.id.length > 0,
    true,
  );
  TestValidator.equals(
    "product name present",
    retrievedImage.product.name.length > 0,
    true,
  );
  TestValidator.equals(
    "product description present",
    retrievedImage.product.description.length > 0,
    true,
  );
  TestValidator.equals(
    "product base_price positive",
    retrievedImage.product.base_price > 0,
    true,
  );
}
