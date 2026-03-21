import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a subcategory that belongs to a parent category.
 *
 * Validates the hierarchical navigation context in the IInvert response type.
 * The response should include the parent category reference (ISummary) showing
 * the parent's id, name, and description. The subcategories array should be
 * empty since leaf categories have no children.
 *
 * @param connection Base API connection
 */
export async function test_api_category_retrieval_as_subcategory(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for the subcategory ID
  const subcategoryId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the subcategory by ID
  const subcategory = await api.functional.ecommerceMall.categories.at(
    connection,
    { categoryId: subcategoryId },
  );
  // Validate the response with typia.assert for complete runtime type validation
  typia.assert(subcategory);
  // Validate the IInvert structure - this is a subcategory, so it should have a parent
  TestValidator.predicate(
    "subcategory has parent reference",
    subcategory.parent !== null && subcategory.parent !== undefined,
  );
  // Validate the parent ISummary structure
  if (subcategory.parent) {
    TestValidator.predicate(
      "parent has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        subcategory.parent.id,
      ),
    );
    TestValidator.equals(
      "parent has name",
      subcategory.parent.name !== undefined && subcategory.parent.name !== null,
      true,
    );
    TestValidator.equals(
      "parent has description",
      subcategory.parent.description !== undefined,
      true,
    );
  }
  // Subcategory is a leaf node, so it should have no subcategories
  TestValidator.equals(
    "leaf subcategory has empty subcategories array",
    subcategory.subcategories,
    [],
  );
}
