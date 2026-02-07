import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_product_images_retrieval_after_creation(
  connection: api.IConnection,
): Promise<void> {
  const categoryConnection: api.IConnection = { host: connection.host };
  const category = await generate_random_ecommerce_categories_create(
    categoryConnection,
    {
      body: {
        name: `${RandomGenerator.name()} Category`,
      },
    },
  );
  const productConnection: api.IConnection = { host: connection.host };
  const product = await generate_random_ecommerce_products_create(
    productConnection,
    {
      body: {
        name: `${RandomGenerator.name()} Product`,
        description: RandomGenerator.content({ paragraphs: 1 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
        categoriesId: category.id,
      },
    },
  );
  const response = await api.functional.ecommerce.products.images.index(
    connection,
    {
      productId: product.id,
      body: {
        page: 1,
        size: 10,
      },
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "Should return at least one image",
    response.data.length > 0,
  );
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = response.data[i];
    const next = response.data[i + 1];
    TestValidator.predicate(
      "Images should be returned in chronological order",
      new Date(current.created_at) <= new Date(next.created_at),
    );
  }
  const hasPrimary = response.data.some((image) => image.is_primary === true);
  TestValidator.predicate(
    "At least one image should be marked as primary",
    hasPrimary,
  );
}
