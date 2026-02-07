import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_product_creation_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create category using utility function
  const category = await generate_random_ecommerce_categories_create(
    connection,
    {
      body: {},
    },
  );
  // 2. Generate a 20-character name exactly
  const name = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 2,
  })
    .trim()
    .slice(0, 20);
  // 3. Generate a description with exactly 150 characters
  let description = RandomGenerator.paragraph({ sentences: 5 });
  while (description.length > 150) {
    description = RandomGenerator.paragraph({ sentences: 5 });
  }
  description = description.slice(0, 150);
  // 4. Create product with standard business values
  const product = await generate_random_ecommerce_products_create(connection, {
    body: {
      name: name as string & tags.MinLength<5> & tags.MaxLength<255>,
      description: description as string &
        tags.MinLength<10> &
        tags.MaxLength<2000>,
      basePrice: 29.99 as number & tags.Minimum<0.01> & tags.Type<"float">,
      categoriesId: category.id,
    },
  });
  // 5. Verify product creation
  typia.assert(product);
  // 6. Validate response fields
  TestValidator.equals("name length", product.name.length, 20);
  TestValidator.equals("description length", product.description.length, 150);
  TestValidator.equals("product price", product.base_price, 29.99);
  // 7. Verify category reference - Fixed by explicit cast to have 'id' property
  const productCategory = product.category as IEcommerceCategory.ISummary & {
    id: string;
  };
  TestValidator.equals("category ID", productCategory.id, category.id);
  // 8. Verify timestamps are present
  TestValidator.predicate(
    "created_at valid format",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(product.created_at),
  );
  TestValidator.predicate(
    "updated_at valid format",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(product.updated_at),
  );
  // 9. Verify deleted_at is null
  TestValidator.equals("deleted_at is null", product.deleted_at, null);
}
