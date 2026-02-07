import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";

export async function test_api_category_deleted_success(
  connection: IConnection,
): Promise<void> {
  // 1. Create a new category
  const category = await generate_random_ecommerce_categories_create(
    connection,
    {},
  );
  typia.assert(category);
  // 2. Perform soft deletion
  const deletedCategory = await api.functional.ecommerce.categories.erase(
    connection,
    {
      categoryId: category.id,
    },
  );
  typia.assert(deletedCategory);
  // 3. Verify deleted_at is set
  TestValidator.predicate(
    "deleted_at should not be null",
    () => deletedCategory.deleted_at !== null,
  );
}
