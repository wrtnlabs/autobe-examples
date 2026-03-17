import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that unauthenticated users (guests) can browse all active categories on the platform.
 *
 * This test verifies:
 * 1. Guest access without authentication succeeds
 * 2. Response structure matches IPageIEcommerceMallCategory.ISummary
 * 3. Categories include all required fields (id, name, parent, created_at, deleted_at)
 * 4. Default sorting by created_at descending
 * 5. Deleted categories are NOT visible to guests
 * 6. Pagination metadata is correct
 * 7. Empty category list returns proper structure
 * 8. Search functionality works (partial case-insensitive match)
 * 9. Parent filtering works (parent_id filter)
 * 10. Custom pagination parameters work correctly
 */
export async function test_api_category_browsing_as_guest(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default category listing (guest access, no auth)
  const defaultListing: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {} satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(defaultListing);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    defaultListing.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", defaultListing.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    defaultListing.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    defaultListing.pagination.pages >= 0,
  );
  // Test 2: Validate category summary structure
  if (defaultListing.data.length > 0) {
    const firstCategory = defaultListing.data[0];
    typia.assert(firstCategory);
    // Validate required fields exist
    TestValidator.predicate(
      "category has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstCategory.id,
      ),
    );
    TestValidator.predicate("category has name", firstCategory.name.length > 0);
    TestValidator.predicate(
      "category has created_at",
      firstCategory.created_at.length > 0,
    );
    TestValidator.predicate(
      "category deleted_at is null or datetime",
      firstCategory.deleted_at === null ||
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
          firstCategory.deleted_at,
        ),
    );
    // Test 3: Verify deleted categories are NOT visible (deleted_at should be null)
    for (const category of defaultListing.data) {
      TestValidator.predicate(
        "category is not deleted",
        category.deleted_at === null,
      );
    }
    // Test 4: Verify sorting by created_at descending (newest first)
    for (let i = 1; i < defaultListing.data.length; i++) {
      TestValidator.predicate(
        `category ${i} created_at <= category ${i - 1} created_at`,
        defaultListing.data[i].created_at <=
          defaultListing.data[i - 1].created_at,
      );
    }
    // Test 5: Validate parent structure (if parent exists)
    if (firstCategory.parent !== null) {
      typia.assert(firstCategory.parent);
      TestValidator.predicate(
        "parent has uuid id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          firstCategory.parent.id,
        ),
      );
      TestValidator.predicate(
        "parent has name",
        firstCategory.parent.name.length > 0,
      );
    }
  }
  // Test 6: Test custom pagination parameters
  const customPagination: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(customPagination);
  TestValidator.equals(
    "custom pagination limit",
    customPagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "custom pagination data respects limit",
    customPagination.data.length <= 10,
  );
  // Test 7: Test sorting by name ascending
  const sortedByNameAsc: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        sortBy: "name",
        sortOrder: "asc",
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(sortedByNameAsc);
  if (sortedByNameAsc.data.length > 1) {
    for (let i = 1; i < sortedByNameAsc.data.length; i++) {
      TestValidator.predicate(
        `name ${i} >= name ${i - 1} (ascending)`,
        sortedByNameAsc.data[i].name >= sortedByNameAsc.data[i - 1].name,
      );
    }
  }
  // Test 8: Test sorting by name descending
  const sortedByNameDesc: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        sortBy: "name",
        sortOrder: "desc",
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(sortedByNameDesc);
  if (sortedByNameDesc.data.length > 1) {
    for (let i = 1; i < sortedByNameDesc.data.length; i++) {
      TestValidator.predicate(
        `name ${i} <= name ${i - 1} (descending)`,
        sortedByNameDesc.data[i].name <= sortedByNameDesc.data[i - 1].name,
      );
    }
  }
  // Test 9: Test search functionality (partial match)
  if (defaultListing.data.length > 0) {
    const sampleCategory = defaultListing.data[0];
    const searchTerm = sampleCategory.name.substring(
      0,
      Math.max(1, Math.floor(sampleCategory.name.length / 2)),
    );
    if (searchTerm.length > 0) {
      const searchResult: IPageIEcommerceMallCategory.ISummary =
        await api.functional.ecommerceMall.categories.index(connection, {
          body: {
            search: searchTerm,
          } satisfies IEcommerceMallCategory.IRequest,
        });
      typia.assert(searchResult);
      // All results should contain the search term (case-insensitive)
      for (const category of searchResult.data) {
        TestValidator.predicate(
          `category name contains search term "${searchTerm}"`,
          category.name.toLowerCase().includes(searchTerm.toLowerCase()),
        );
      }
    }
  }
  // Test 10: Test parent_id filtering (get only parent categories)
  const parentOnly: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        parent_id: undefined,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(parentOnly);
  // All returned categories should have parent === null (they are parent categories)
  for (const category of parentOnly.data) {
    TestValidator.predicate(
      "category has no parent (is parent category)",
      category.parent === null,
    );
  }
  // Test 11: Verify empty result structure (if no categories match filter)
  // Use a search term that likely won't match anything
  const unlikelySearch: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        search: RandomGenerator.alphabets(20), // Random 20-char string unlikely to match
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(unlikelySearch);
  // If no results, pagination should reflect that
  if (unlikelySearch.data.length === 0) {
    TestValidator.equals(
      "empty result pagination current",
      unlikelySearch.pagination.current,
      1,
    );
    TestValidator.equals(
      "empty result pagination records",
      unlikelySearch.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty result pagination pages",
      unlikelySearch.pagination.pages,
      0,
    );
  }
}