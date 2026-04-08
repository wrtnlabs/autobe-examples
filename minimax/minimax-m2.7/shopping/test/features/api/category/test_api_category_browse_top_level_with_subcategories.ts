import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { ArrayUtil, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia from "typia";

export async function test_api_category_browse_top_level_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // Call API with empty body to retrieve top-level categories
  // When parentId is omitted, API returns only top-level categories (where parent_id IS NULL)
  const output = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {} satisfies IEcommerceMallCategory.IRequest,
    },
  );
  // Validate complete response structure with typia.assert()
  typia.assert(output);
  // Validate response has pagination metadata
  TestValidator.equals("pagination exists", output.pagination !== null, true);
  // Narrow pagination to non-null
  const pagination = typia.assert(output.pagination);
  // Access pagination fields - cast to any to handle unknown IPagination structure
  const pg = pagination as any;
  TestValidator.predicate(
    "pagination page is non-negative number",
    typeof pg.page === "number" && pg.page >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative number",
    typeof pg.limit === "number" && pg.limit >= 0,
  );
  TestValidator.predicate(
    "pagination total is non-negative number",
    typeof pg.total === "number" && pg.total >= 0,
  );
  TestValidator.predicate(
    "pagination page_count is non-negative number",
    typeof pg.page_count === "number" && pg.page_count >= 0,
  );
  // Validate data array exists
  TestValidator.equals("data array exists", Array.isArray(output.data), true);
  // Verify all returned categories are top-level (parent should be null/undefined)
  for (const category of output.data) {
    // Parent must be null for top-level categories (undefined or null are both acceptable)
    TestValidator.predicate(
      "category is top-level (parent is null/undefined)",
      category.parent === null || category.parent === undefined,
    );
    // Verify each category has subcategories array
    TestValidator.equals(
      "category has subcategories array",
      Array.isArray(category.subcategories),
      true,
    );
    // Verify category has required fields
    TestValidator.predicate(
      "category has valid id (uuid format)",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category.id,
      ),
    );
    TestValidator.predicate(
      "category has non-empty name",
      category.name.length > 0,
    );
    TestValidator.predicate(
      "category has valid createdAt (ISO 8601 format)",
      !isNaN(Date.parse(category.createdAt)),
    );
  }
  // Verify categories are sorted by createdAt descending (newest first)
  for (let i = 0; i < output.data.length - 1; i++) {
    const current = new Date(output.data[i].createdAt).getTime();
    const next = new Date(output.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      "categories sorted by createdAt descending",
      current >= next,
    );
  }
}