import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
export async function test_api_category_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Create unauthenticated connection following connection isolation pattern
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random valid UUID for category ID
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the API endpoint to retrieve category by ID
  // This works for both authenticated and unauthenticated users as per specification
  const retrievedCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.categories.at(
      guestConnection, // Use unauthenticated connection
      {
        categoryId: categoryId,
      },
    );
  // Validate response type using typia.assert - this verifies ALL properties and structure
  typia.assert(retrievedCategory);
  // No additional validation needed - typia.assert() provides complete type safety
  // All required fields (id, name, created_at) are guaranteed by the type system
  // Optional field (description) is handled correctly by the type system
}
