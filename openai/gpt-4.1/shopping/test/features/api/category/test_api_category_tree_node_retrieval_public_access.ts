import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";

/**
 * Validate public access retrieval of a category node within a shopping
 * category tree.
 *
 * This test asserts any user, whether unauthenticated or authenticated, may
 * retrieve the full business/taxonomy node info for a specific category within
 * a valid category tree by their codes.
 *
 * 1. Generate random valid codes for treeCode and categoryCode, simulating a
 *    public or catalog navigation lookup
 * 2. Fetch the category node by code via the API and validate type and all
 *    documented fields
 * 3. Validate the returned node is active (not soft deleted), contains all
 *    required identifiers, naming, display, and navigation properties, and
 *    conforms to audit trail expectations
 * 4. Check the error response for missing or invalid codes (simulate by using
 *    random strings or clearly invalid codes)
 * 5. Ensure that the endpoint does not require authentication and is publicly
 *    accessible
 */
export async function test_api_category_tree_node_retrieval_public_access(
  connection: api.IConnection,
) {
  // 1. Retrieve an active shopping category node with random codes (simulate as if valid in real system)
  const treeCode: string = RandomGenerator.alphaNumeric(12);
  const categoryCode: string = RandomGenerator.alphaNumeric(8);
  const result: IShoppingCategory =
    await api.functional.shopping.categoryTrees.categories.at(connection, {
      treeCode,
      categoryCode,
    });
  typia.assert(result);
  // Field-level business validation
  TestValidator.predicate(
    "category id is a valid uuid",
    typeof result.id === "string" && /[0-9a-f\-]{36}/i.test(result.id),
  );
  TestValidator.predicate(
    "tree foreign key is a valid uuid",
    typeof result.category_tree_id === "string" &&
      /[0-9a-f\-]{36}/i.test(result.category_tree_id),
  );
  TestValidator.predicate(
    "category_code is returned",
    typeof result.category_code === "string" && result.category_code.length > 0,
  );
  TestValidator.predicate(
    "category_name is returned",
    typeof result.category_name === "string" && result.category_name.length > 0,
  );
  TestValidator.predicate(
    "sort_order is int32",
    Number.isInteger(result.sort_order),
  );
  TestValidator.predicate(
    "created_at timestamp present",
    typeof result.created_at === "string" && result.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp present",
    typeof result.updated_at === "string" && result.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null or undefined for active",
    result.deleted_at,
    null,
  );

  // 2. Error validation for invalid codes
  await TestValidator.error("invalid treeCode should throw", async () => {
    await api.functional.shopping.categoryTrees.categories.at(connection, {
      treeCode: "invalid-tree-code",
      categoryCode: categoryCode,
    });
  });

  await TestValidator.error("invalid categoryCode should throw", async () => {
    await api.functional.shopping.categoryTrees.categories.at(connection, {
      treeCode: treeCode,
      categoryCode: "invalid-category-code",
    });
  });

  // 3. Ensure unauthenticated connection also works (simulate public)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const publicResult: IShoppingCategory =
    await api.functional.shopping.categoryTrees.categories.at(unauthConn, {
      treeCode,
      categoryCode,
    });
  typia.assert(publicResult);
  TestValidator.equals(
    "public and authenticated retrieval produce same id",
    publicResult.id,
    result.id,
  );
}
