import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_tree_empty_platform(
  connection: api.IConnection,
): Promise<void> {
  // Call public endpoint without authentication
  const tree = await api.functional.ecommerceMall.categories.tree(connection);
  typia.assert(tree);
  // Validate empty platform scenario - no root categories exist
  TestValidator.equals(
    "root categories array should be empty",
    tree.children.length,
    0,
  );
}
