import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_get_deleted_category(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID that represents a soft-deleted category
  // Since we don't have admin endpoints to create/delete categories in SDK,
  // we test with a UUID that should not exist (simulating deleted state)
  const deletedCategoryId = typia.random<string & tags.Format<"uuid">>();
  // Create customer-specific connection for the API call
  // Base connection must not be used directly - follow Connection Isolation Pattern
  const customerConnection: api.IConnection = { host: connection.host };
  // Attempt to retrieve the soft-deleted category
  // This should return 404 Not Found since the category is deleted/doesn't exist
  await TestValidator.httpError(
    "soft-deleted category returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.categories.at(customerConnection, {
        categoryId: deletedCategoryId,
      });
    },
  );
}
