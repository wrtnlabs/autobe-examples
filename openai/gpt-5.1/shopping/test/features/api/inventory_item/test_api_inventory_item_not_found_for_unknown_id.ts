import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";

/**
 * Validate not-found behavior for inventory item lookup by unknown id.
 *
 * ## Business purpose
 *
 * This test ensures that the inventory detail endpoint does not accidentally
 * expose data or return a successful response when a caller passes a UUID that
 * is not associated with any active inventory record. This is critical for both
 * data privacy and predictable API semantics: clients must be able to
 * distinguish between "found" and "not found" cleanly when navigating inventory
 * tools.
 *
 * Since this particular endpoint is read-only and we have no companion
 * create/delete APIs in the provided materials, the test focuses on the
 * 404-style behavior triggered purely by an unknown UUID rather than performing
 * full lifecycle setup and teardown.
 *
 * ## Test steps
 *
 * 1. Generate a random UUID value using typia.random<string &
 *    tags.Format<"uuid">>(). This UUID is never used to create any inventory
 *    record within this test, so it is effectively guaranteed to be unknown to
 *    the system.
 * 2. Call api.functional.shoppingMall.inventoryItems.at(connection, {
 *    inventoryItemId }) with that random UUID.
 * 3. Use TestValidator.httpError to assert that the call fails with a client-side
 *    not-found HTTP status (404). We do not introspect the body or headers; we
 *    only care that an HttpError is thrown with the correct status code and
 *    that no IShoppingMallInventoryItem value is produced.
 * 4. For additional safety, also include a simple TestValidator.error path that
 *    ensures a successful response is NOT produced for that id by expecting the
 *    promise to reject.
 *
 * ## Notes
 *
 * - The test must not use typia.assert on the success path because in the
 *   not-found scenario, we expect the request to throw before any DTO is
 *   returned.
 * - We intentionally do not depend on any other endpoints or fixtures since the
 *   scenario is specifically about unknown identifiers.
 */
export async function test_api_inventory_item_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Prepare an unknown UUID that is never used to create inventory.
  const unknownInventoryItemId = typia.random<string & tags.Format<"uuid">>();

  // 2 & 3. Expect a 404-style not-found HttpError for this unknown id.
  await TestValidator.httpError(
    "inventory lookup with unknown id should result in 404 not found",
    404,
    async () => {
      await api.functional.shoppingMall.inventoryItems.at(connection, {
        inventoryItemId: unknownInventoryItemId,
      });
    },
  );

  // 4. Additionally ensure that the operation never resolves successfully
  //    for this unknown UUID, by asserting that calling it must fail.
  await TestValidator.error(
    "inventory lookup with unknown id must not succeed",
    async () => {
      await api.functional.shoppingMall.inventoryItems.at(connection, {
        inventoryItemId: unknownInventoryItemId,
      });
    },
  );
}
