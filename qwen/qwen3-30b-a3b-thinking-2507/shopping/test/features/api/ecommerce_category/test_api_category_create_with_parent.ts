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

export async function test_api_category_create_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create parent category "Electronics"
  const parent = await generate_random_ecommerce_categories_create(connection, {
    body: { name: "Electronics" } satisfies IEcommerceCategory.ICreate,
  });
  typia.assert(parent);
  // 2. Create child category "Laptops" under "Electronics"
  const child = await generate_random_ecommerce_categories_create(connection, {
    body: {
      name: "Laptops",
      parent: parent.id,
    } satisfies IEcommerceCategory.ICreate,
  });
  typia.assert(child);
  // 3. Verify the hierarchy - check that parent's children array contains the child
  TestValidator.equals(
    "Laptops should be included in Electronics children list",
    parent.children.some((c) => c.id === child.id),
    true,
  );
  TestValidator.equals(
    "Laptops name should be 'Laptops'",
    child.name,
    "Laptops",
  );
}
