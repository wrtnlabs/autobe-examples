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
 * Test retrieving category tree when no categories exist on the platform.
 *
 * Validates the empty state behavior when the ecommerce_mall_categories table contains no records.
 * Verifies that guest users can access this endpoint without authentication and receive a valid
 * response conforming to the IEcommerceMallCategory.ITree schema with an empty children array.
 *
 * This test ensures the system gracefully handles the empty state without errors and guest users
 * can access this endpoint without authentication.
 *
 * 1. Create guest session via authorize_guest_join utility.
 * 2. Call GET /ecommerceMall/guest/categories/tree endpoint.
 * 3. Validate response conforms to IEcommerceMallCategory.ITree schema.
 * 4. Validate children array is empty (not null, not error).
 */
export async function test_api_category_tree_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session for guest actor
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Get category tree when no categories exist
  const tree =
    await api.functional.ecommerceMall.guest.categories.tree(guestConnection);
  typia.assert(tree);
  // 3. Validate response conforms to ITree schema
  // 4. Validate children array is empty (not null, not undefined)
  TestValidator.equals(
    "category tree children is empty array",
    tree.children,
    [] as IEcommerceMallCategory.ITree[],
  );
}
