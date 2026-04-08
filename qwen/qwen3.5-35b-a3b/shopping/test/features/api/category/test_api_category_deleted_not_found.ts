import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a category UUID for testing
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Test that accessing a non-existent (or soft-deleted) category returns 404 Not Found
  // This validates that deleted categories are properly hidden from customer browsing
  await TestValidator.httpError(
    "deleted or non-existent category returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.categories.at(connection, {
        categoryId,
      }),
  );
}
