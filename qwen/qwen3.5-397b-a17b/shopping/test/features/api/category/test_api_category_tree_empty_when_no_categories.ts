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
 * Test guest category tree endpoint returns empty array when no categories exist.
 *
 * Validates that the category tree endpoint handles the edge case of zero categories gracefully. A guest user authenticates with device fingerprint and retrieves the category tree before any categories have been created by administrators.
 *
 * This test ensures the system returns an empty array rather than errors or null values when the categories table is empty, providing a consistent API contract for frontend consumers.
 *
 * 1. Guest authenticates with device fingerprint to obtain session tokens.
 * 2. Guest calls category tree endpoint with valid authentication.
 * 3. Validates response is an empty array with no category objects.
 */
export async function test_api_category_tree_empty_when_no_categories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
    },
  });
  // 2. Retrieve category tree
  const categories =
    await api.functional.shoppingMall.guest.categories.tree(guestConnection);
  // 3. Validate empty response
  TestValidator.predicate(
    "empty category tree",
    Array.isArray(categories) && categories.length === 0,
  );
}
