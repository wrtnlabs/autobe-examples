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
 * Test guest user retrieval of category tree with top-level categories only.
 *
 * Validates that a guest user can successfully retrieve the category navigation structure when only top-level categories exist without any subcategories. The test verifies guest authentication, category tree retrieval, and proper structure validation including empty children arrays.
 *
 * The test ensures that the system correctly handles the edge case where categories have no nested subcategories, returning each top-level category with an empty children array rather than omitting the children property entirely.
 *
 * 1. Guest authentication: Register as guest with device fingerprint to obtain session tokens.
 * 2. Retrieve category tree: Call the tree endpoint using authenticated guest connection.
 * 3. Validate structure: Confirm response is an array of categories with required fields.
 * 4. Validate children arrays: Verify each category has an empty children array indicating no subcategories.
 */
export async function test_api_category_tree_top_level_only_without_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
    },
  });
  typia.assert(guest);
  // 2. Retrieve category tree
  const categories: IShoppingMallCategory.ITree =
    await api.functional.shoppingMall.guest.categories.tree(guestConnection);
  typia.assert(categories);
  // 3. Validate category structure - categories is a single ITree object, not array
  // The ITree type represents a single category node with children
  // Validate the root category has required fields
  TestValidator.predicate("category has id", categories.id !== undefined);
  TestValidator.predicate("category has name", categories.name !== undefined);
  TestValidator.predicate(
    "category name is string",
    typeof categories.name === "string",
  );
  // 4. Validate children array is empty (no subcategories)
  TestValidator.predicate(
    "children is array",
    Array.isArray(categories.children),
  );
  TestValidator.equals(
    "children array is empty",
    categories.children.length,
    0,
  );
}
