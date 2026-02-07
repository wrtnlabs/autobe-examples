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

import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { generate_random_ecommerce_products_images_create } from "../../../generate/generate_random_ecommerce_products_images_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";

export async function test_api_product_image_non_primary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a category for the product to exist in
  const category = await generate_random_ecommerce_categories_create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
      },
    },
  );
  // 2. Create a product using the new category
  const product = await generate_random_ecommerce_products_create(connection, {
    body: {
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      basePrice: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
      categoriesId: category.id,
    },
  });
  typia.assert(product);
  // 3. Add a product image without designating it as primary (is_primary will default to false)
  const image = await generate_random_ecommerce_products_images_create(
    connection,
    {
      body: {
        image_url: "https://example.com/product-image.jpg",
        caption: RandomGenerator.paragraph({ sentences: 1 }),
      },
      params: {
        productId: product.id,
      },
    },
  );
  typia.assert(image);
  // 4. Verify the image is stored correctly but is not primary (is_primary === false)
  TestValidator.predicate(
    "image is not primary (default is_primary=false)",
    image.is_primary === false,
  );
  // 5. Verify the image is associated with the correct product
  TestValidator.equals(
    "product ID matches the image's product",
    image.product.id,
    product.id,
  );
}
