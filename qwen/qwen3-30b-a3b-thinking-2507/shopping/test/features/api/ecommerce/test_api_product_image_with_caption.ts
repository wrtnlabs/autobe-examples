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

export async function test_api_product_image_with_caption(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a category
  const category = await generate_random_ecommerce_categories_create(
    connection,
    {},
  );
  typia.assert(category);
  // 2. Create a product with the category
  const product = await generate_random_ecommerce_products_create(connection, {
    body: {
      categoriesId: category.id,
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      basePrice: typia.random<
        number & tags.Minimum<0.01> & tags.Maximum<10000>
      >(),
    },
  });
  typia.assert(product);
  // 3. Add an image with a caption to the product
  const image = await generate_random_ecommerce_products_images_create(
    connection,
    {
      body: {
        image_url: typia.random<string & tags.Format<"uri">>(),
        caption: "Product image with caption",
      },
      params: {
        productId: product.id,
      },
    },
  );
  typia.assert(image);
  // 4. Verify the caption is stored correctly
  TestValidator.equals(
    "Caption matches input",
    image.caption,
    "Product image with caption",
  );
  TestValidator.predicate(
    "Caption is not null",
    image.caption !== null && image.caption !== undefined,
  );
}
