import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random valid UUID that does not exist in the database
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  // Verify that retrieving a non-existent category returns 404
  await TestValidator.httpError(
    "non-existent category should return 404",
    404,
    async () => {
      await api.functional.ecommerceMall.categories.at(connection, {
        categoryId: nonExistentCategoryId,
      });
    },
  );
}
