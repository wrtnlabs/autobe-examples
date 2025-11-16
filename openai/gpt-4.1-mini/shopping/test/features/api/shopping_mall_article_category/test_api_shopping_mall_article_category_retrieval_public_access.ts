import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";

export async function test_api_shopping_mall_article_category_retrieval_public_access(
  connection: api.IConnection,
) {
  // Obtain a valid UUID for testing by calling SDK's simulated random generator
  // Since no creation API is provided, use typia.random but assert on response to ensure valid format
  const shoppingMallArticleCategoryId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();

  // Call the API function to retrieve the article category details by ID
  const output: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.shoppingMallArticleCategories.at(
      connection,
      { shoppingMallArticleCategoryId },
    );

  // Assert the entire output conforms correctly
  typia.assert(output);

  // Assert the mandatory UUID property 'id' with strict typia assert
  typia.assert<string & tags.Format<"uuid">>(output.id);

  // Assert the 'name' property is a non-empty string
  TestValidator.predicate(
    "category name is non-empty string",
    typeof output.name === "string" && output.name.length > 0,
  );

  // If 'description' is present, it's string or null
  if (output.description !== null && output.description !== undefined) {
    TestValidator.predicate(
      "description is string",
      typeof output.description === "string",
    );
  }

  // parent_id may be null, undefined, or a valid UUID string
  if (output.parent_id !== null && output.parent_id !== undefined) {
    typia.assert<string & tags.Format<"uuid">>(output.parent_id);
  }

  // created_at must be a valid date-time string (ISO 8601 format)
  // typia.assert will verify this
  typia.assert(output.created_at);

  // updated_at may be null, undefined, or valid date-time string
  if (output.updated_at !== null && output.updated_at !== undefined) {
    typia.assert(output.updated_at);
  }
}
