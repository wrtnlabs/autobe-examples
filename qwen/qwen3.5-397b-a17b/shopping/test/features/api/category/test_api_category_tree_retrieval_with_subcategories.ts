import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest user category tree retrieval with subcategory validation.
 *
 * Validates the complete category hierarchy retrieval flow for guest users. Ensures that guests can access the full category navigation structure including top-level categories and their nested subcategories.
 *
 * The test verifies the tree structure integrity including proper nesting, two-level hierarchy limit, and data completeness. All category nodes must contain required fields (id, name, description, children) and subcategories must have empty children arrays per business rules.
 *
 * 1. Guest authenticates with device fingerprint to obtain session tokens.
 * 2. Retrieves complete category tree from guest endpoint.
 * 3. Validates response structure matches IShoppingMallCategory.ITree schema.
 * 4. Validates each top-level category has required fields and children array.
 * 5. Validates subcategories are properly nested with empty children arrays.
 * 6. Validates category data completeness and hierarchy constraints.
 */
export async function test_api_category_tree_retrieval_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Retrieve category tree
  const categoryTree =
    await api.functional.shoppingMall.guest.categories.tree(guestConnection);
  typia.assert(categoryTree);
  // 3. Validate data completeness: tree exists and has at least one top-level category
  TestValidator.predicate(
    "category tree has at least one category",
    categoryTree !== null && categoryTree !== undefined && categoryTree.children.length > 0,
  );
  // 4. Validate two-level hierarchy limit: all subcategories have empty children
  for (const category of categoryTree.children) {
    for (const subcategory of category.children) {
      TestValidator.predicate(
        "subcategory has no nested children (two-level limit)",
        subcategory.children.length === 0,
      );
    }
  }
}