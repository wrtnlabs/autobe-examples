import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving the complete category hierarchy tree as a guest user.
 *
 * Validates the category tree endpoint accessible without authentication.
 * Verifies the hierarchical structure where parent categories contain their
 * direct subcategories as nested children. The response must conform to
 * IEcommerceMallCategory.ITree schema with proper parent-child relationships.
 *
 * 1. Guest user joins (establishes session context for guest actor).
 * 2. Fetches category tree via GET /ecommerceMall/guest/categories/tree.
 * 3. Validates response structure: array of parent categories with nested children.
 * 4. Verifies alphabetical sorting of both parent categories and subcategories.
 * 5. Validates UUID format for all category IDs.
 * 6. Confirms description field is nullable (may be null or string).
 */
export async function test_api_category_tree_with_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest session
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Fetch category tree
  const categoryTree: IEcommerceMallCategory.ITree =
    await api.functional.ecommerceMall.guest.categories.tree(guestConnection);
  typia.assert(categoryTree);
  // 3. Validate response is an object with children array
  TestValidator.predicate(
    "category tree is an object",
    categoryTree !== null && categoryTree !== undefined,
  );
  // 4. Validate parent category structure
  const parent = categoryTree;
  // Validate required fields exist
  TestValidator.predicate(
    "parent category has id",
    parent.id !== undefined && parent.id !== null,
  );
  TestValidator.predicate(
    "parent category has name",
    parent.name !== undefined && parent.name !== null,
  );
  TestValidator.predicate(
    "parent category has children array",
    Array.isArray(parent.children),
  );
  // Validate id is UUID format
  TestValidator.predicate(
    "parent category id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      parent.id,
    ),
  );
  // Validate description is nullable (null or string or undefined)
  TestValidator.predicate(
    "description is nullable",
    parent.description === null ||
      parent.description === undefined ||
      typeof parent.description === "string",
  );
  // Validate each child subcategory
  for (const child of parent.children) {
    TestValidator.predicate(
      "child category has id",
      child.id !== undefined && child.id !== null,
    );
    TestValidator.predicate(
      "child category has name",
      child.name !== undefined && child.name !== null,
    );
    TestValidator.predicate(
      "child category has children array",
      Array.isArray(child.children),
    );
    // Validate child id is UUID format
    TestValidator.predicate(
      "child category id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        child.id,
      ),
    );
  }
  // 5. Validate alphabetical sorting of subcategories within the parent
  if (parent.children.length > 1) {
    for (let i = 0; i < parent.children.length - 1; i++) {
      TestValidator.predicate(
        "subcategories sorted alphabetically by name",
        parent.children[i].name.localeCompare(parent.children[i + 1].name) <=
          0,
      );
    }
  }
  // 6. Validate no duplicate category IDs across the tree
  const allCategoryIds: string[] = [];
  const collectIds = (categories: IEcommerceMallCategory.ITree[]) => {
    for (const cat of categories) {
      allCategoryIds.push(cat.id);
      collectIds(cat.children);
    }
  };
  collectIds(parent.children);
  const uniqueIds = new Set(allCategoryIds);
  TestValidator.equals(
    "all category IDs are unique",
    allCategoryIds.length,
    uniqueIds.size,
  );
}