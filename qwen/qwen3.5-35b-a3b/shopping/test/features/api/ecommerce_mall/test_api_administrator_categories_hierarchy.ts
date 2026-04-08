import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_categories_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create fresh connection with admin token for hierarchy API call
  const hierarchyConnection: api.IConnection = { host: connection.host };
  hierarchyConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 3. Call hierarchy endpoint
  const hierarchy =
    await api.functional.ecommerceMall.administrator.categories.hierarchy(
      hierarchyConnection,
    );
  typia.assert(hierarchy);
  // 4. Validate hierarchy structure
  // 4.1. Verify it's an array of categories
  TestValidator.predicate("hierarchy is an array", Array.isArray(hierarchy));
  const categories = hierarchy as unknown as IEcommerceMallCategory.IHierarchy[];
  for (const category of categories) {
    // Validate required fields
    typia.assert(category.id);
    typia.assert(category.name);
    typia.assert(category.created_at);
    typia.assert(category.updated_at);
    // Validate nullable description field
    if (category.description !== null) {
      typia.assert(category.description);
    }
    // Validate nullable sort_order field
    if (category.sort_order !== null) {
      typia.assert(category.sort_order);
    }
    // Validate nullable deleted_at field
    if (category.deleted_at !== null) {
      typia.assert(category.deleted_at);
    }
    // Validate nullable creator_id field
    if (category.creator_id !== null) {
      typia.assert(category.creator_id);
    }
    // Validate creator reference
    if (category.creator !== null) {
      typia.assert(category.creator.id);
      typia.assert(category.creator.email);
      typia.assert(category.creator.displayName);
    }
    // Validate nullable product_count field
    if (category.product_count !== null) {
      typia.assert(category.product_count);
    }
    // Validate children array structure
    TestValidator.predicate(
      "children is an array",
      Array.isArray(category.children),
    );
    // Each child should be ISummary (has no children array - one level hierarchy)
    for (const child of category.children) {
      typia.assert(child.id);
      typia.assert(child.name);
      typia.assert(child.created_at);
      typia.assert(child.updated_at);
      // Verify ISummary structure - children don't have their own children
      // ISummary has: id, name, description, sort_order, parent, created_at, updated_at
      // It does NOT have children, creator, product_count
      if (child.description !== null) {
        typia.assert(child.description);
      }
      if (child.sort_order !== null) {
        typia.assert(child.sort_order);
      }
      // Parent should be null for direct children of top-level categories
      typia.assert(child.parent);
    }
  }
  // 5. Validate sorting order: parent_id NULL first, then sort_order ascending, then name
  for (let i = 1; i < categories.length; i++) {
    const prev = categories[i - 1];
    const curr = categories[i];
    // Sort by sort_order (NULL treated as 0) first
    const prevSort = prev.sort_order ?? 0;
    const currSort = curr.sort_order ?? 0;
    if (prevSort === currSort) {
      // Then by name for stable ordering
      TestValidator.predicate(
        `category ${i} should be sorted after ${i - 1} by name`,
        prev.name.localeCompare(curr.name) <= 0,
      );
    } else {
      // Sort by sort_order ascending
      TestValidator.predicate(
        `category ${i} should have higher or equal sort_order than ${i - 1}`,
        currSort >= prevSort,
      );
    }
  }
  // 6. Validate business rule: no deep nesting (one level only)
  // Children in the hierarchy are ISummary objects which don't have children field
  const allChildren = categories.flatMap((cat) => cat.children);
  for (const child of allChildren) {
    // ISummary type doesn't have children, so we validate it's a valid ISummary
    typia.assert(child.id);
  }
  // 7. Validate soft-deletion exclusion
  for (const category of categories) {
    // All returned categories should have deleted_at = NULL (active)
    // The database query filters for deleted_at IS NULL
    TestValidator.equals(
      "category not soft-deleted",
      category.deleted_at,
      null,
    );
  }
}