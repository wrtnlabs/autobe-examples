import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
export async function test_api_category_retrieval_top_level(connection: api.IConnection): Promise<void> {
    // Generate a random UUID for category ID
    const categoryId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    
    // Call the API to retrieve category details
    const category = await api.functional.ecommerce.categories.at(connection, { categoryId });
    
    // Validate the complete response structure - this handles all type and format validation
    typia.assert(category);
    
    // Verify top-level category business logic: parent fields should be null
    TestValidator.equals("parent_category_id should be null for top-level category", category.parent_category_id, null);
    TestValidator.equals("parent should be null for top-level category", category.parent, null);
}