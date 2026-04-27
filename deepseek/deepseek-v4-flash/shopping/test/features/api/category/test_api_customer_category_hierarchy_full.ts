import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated customer can retrieve the complete category hierarchy tree.
 *
 * Validates the PATCH /eCommerceMall/customer/categories/hierarchy endpoint
 * accessible to authenticated customers. Since no admin category creation
 * endpoints are available in the test SDK, this test validates the behavior
 * with whatever categories exist in the system, focusing on structural
 * correctness of the response.
 *
 * The hierarchy endpoint returns all non-deleted categories organized in a
 * two-level parent-child structure. Top-level categories (categories with no
 * parent) each contain their nested subcategories. Only two levels of nesting
 * are supported.
 *
 * Validates:
 * 1. Response is a valid IECommerceMallCategory.IHierarchy with
 *    topLevelCategories array
 * 2. Each category node has all required fields from
 *    IECommerceMallCategory.IHierarchyNode: id, name, description, parent,
 *    subcategories, products_count, created_at, updated_at, deleted_at
 * 3. Top-level categories have null parent field
 * 4. Subcategories have non-null parent pointing to parent ISummary
 * 5. All returned categories have deleted_at: null
 * 6. Categories ordered by created_at ASC within each level
 * 7. Leaf categories have empty subcategories array
 */
export async function test_api_customer_category_hierarchy_full(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(authorized);
  // 2. Retrieve category hierarchy without name filter
  const hierarchy: IECommerceMallCategory.IHierarchy =
    await api.functional.eCommerceMall.customer.categories.hierarchy.search(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(hierarchy);
  // 3. Validate structure
  TestValidator.predicate("topLevelCategories is an array", () =>
    Array.isArray(hierarchy.topLevelCategories),
  );
  // 4. Validate ordering of top-level categories by created_at ASC
  for (let i = 1; i < hierarchy.topLevelCategories.length; i++) {
    TestValidator.predicate(
      "top-level categories ordered by created_at ASC",
      () =>
        new Date(hierarchy.topLevelCategories[i - 1].created_at).getTime() <=
        new Date(hierarchy.topLevelCategories[i].created_at).getTime(),
    );
  }
  // 5. If categories exist, validate each node's structure
  for (const category of hierarchy.topLevelCategories) {
    validateCategoryNode(category, false);
  }
}
/**
 * Validates a single IHierarchyNode for structural correctness.
 *
 * Checks all required fields exist, parent relationship is correct
 * (null for top-level, non-null ISummary for subcategories), deleted_at
 * is null, and subcategories are also validated recursively.
 *
 * @param node - The category node to validate
 * @param isSubcategory - Whether this node is expected to be a subcategory
 */
function validateCategoryNode(
  node: IECommerceMallCategory.IHierarchyNode,
  isSubcategory: boolean,
): void {
  // All required fields must be present and non-null except parent and deleted_at
  typia.assert(node);
  // Parent should be null for top-level categories, non-null for subcategories
  if (isSubcategory) {
    TestValidator.predicate(
      "subcategory has non-null parent",
      () => node.parent !== null,
    );
  } else {
    TestValidator.predicate(
      "top-level category has null parent",
      () => node.parent === null,
    );
  }
  // deleted_at must be null (no soft-deleted categories in the tree)
  TestValidator.predicate(
    "category is not soft-deleted",
    () => node.deleted_at === null,
  );
  // If this is a top-level category, validate its subcategories
  if (!isSubcategory) {
    // Check ordering: subcategories should be ordered by created_at ASC
    for (let i = 1; i < node.subcategories.length; i++) {
      TestValidator.predicate(
        "subcategories ordered by created_at ASC",
        () =>
          new Date(node.subcategories[i - 1].created_at).getTime() <=
          new Date(node.subcategories[i].created_at).getTime(),
      );
    }
    // Recursively validate each subcategory
    for (const sub of node.subcategories) {
      validateCategoryNode(sub, true);
    }
  } else {
    // Leaf subcategories must have empty subcategories array
    TestValidator.predicate(
      "leaf subcategory has empty subcategories",
      () => node.subcategories.length === 0,
    );
  }
}
