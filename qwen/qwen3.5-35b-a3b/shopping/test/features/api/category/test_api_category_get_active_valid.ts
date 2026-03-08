import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_get_active_valid(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid category UUID
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Call GET /ecommerceMall/categories/{categoryId}
  const output = await api.functional.ecommerceMall.categories.at(connection, {
    categoryId,
  });
  // Validate response structure and all field types
  typia.assert(output);
  // Response contains all expected fields with correct types:
  // - id: UUID format string
  // - name: string (1-500 chars)
  // - description: string | null
  // - is_leaf: boolean
  // - created_at: ISO 8601 timestamp
  // - updated_at: ISO 8601 timestamp
  // - deleted_at: null (for active categories)
  // - parent: ISummary | null | undefined
}
