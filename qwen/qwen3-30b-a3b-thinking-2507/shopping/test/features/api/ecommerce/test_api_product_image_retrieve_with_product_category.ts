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

export async function test_api_product_image_retrieve_with_product_category(
  connection: api.IConnection,
): Promise<void> {
  // Generate random UUIDs for product and image
  const productId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the product image
  const output = await api.functional.ecommerce.products.images.at(connection, {
    productId,
    imageId,
  });
  typia.assert(output);
  // Verify the product is included in the response
  TestValidator.notEquals("product must exist", output.product, null);
  // Verify the category relationship within the product
  TestValidator.notEquals(
    "category must exist within product",
    output.product.category,
    null,
  );
}
