import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_category_retrieve_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test report category retrieval for a soft-deleted category.
   * 1. Retrieve a report category marked as soft-deleted (deleted_at timestamp set) using a valid UUID ID.
   * 2. Verify the endpoint returns 200 status with category details including the deleted_at timestamp.
   * 3. Confirm soft-deleted categories remain accessible through the API without returning 404.
   */
  const softDeletedCategoryId = "8d3d8c10-0c4b-4a44-98f9-3d3c9b5e2d8b";
  const category = await api.functional.communityPlatform.report_categories.at(
    connection,
    { id: softDeletedCategoryId },
  );
  typia.assert(category);
  TestValidator.predicate(
    "soft-deleted category should have deleted_at timestamp",
    category.deleted_at !== null,
  );
}
