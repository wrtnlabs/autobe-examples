import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlistItem";

/**
 * E2E test for customer-owned wishlist item update.
 *
 * This scenario validates that an authenticated customer can update a note
 * field on a wishlist item they own, checks immutability of all other fields,
 * and ensures authorization boundaries are respected. It also verifies the
 * correct persistence of updates, as well as the ability to clear the note.
 * Negative path covers forbidden access from a non-owner actor.
 */
export async function test_api_wishlist_item_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customerReq = typia.random<IShoppingCustomer.ICreate>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerReq,
  });
  typia.assert(customer);

  // 2. Create a wishlist item (assume default wishlistId from initial returned context)
  // We'll randomly generate a UUID for the wishlistId.
  const wishlistId = typia.random<string & tags.Format<"uuid">>();
  const skuCode = RandomGenerator.alphaNumeric(12);
  const itemCreate = {
    sku_code: skuCode,
  } satisfies IShoppingWishlistItem.ICreate;
  const createdItem =
    await api.functional.shopping.customer.wishlists.items.create(connection, {
      wishlistId,
      body: itemCreate,
    });
  typia.assert(createdItem);
  TestValidator.equals(
    "item created with matching sku_code",
    createdItem.sku.sku_code,
    skuCode,
  );
  TestValidator.equals(
    "initial note is undefined",
    createdItem.note,
    undefined,
  );

  // 3. Update the wishlist item by setting a note
  const itemId = createdItem.id;
  const noteValue = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 10,
    wordMax: 20,
  }).slice(0, 50); // up to 255 chars
  const noteUpdate = {
    note: noteValue,
  } satisfies IShoppingWishlistItem.IUpdate;
  const updatedItem =
    await api.functional.shopping.customer.wishlists.items.update(connection, {
      wishlistId,
      itemId,
      body: noteUpdate,
    });
  typia.assert(updatedItem);
  // SKU, added_at must be immutable
  TestValidator.equals("id unchanged after update", updatedItem.id, itemId);
  TestValidator.equals(
    "SKU reference unchanged after update",
    updatedItem.sku,
    createdItem.sku,
  );
  TestValidator.equals(
    "added_at timestamp unchanged",
    updatedItem.added_at,
    createdItem.added_at,
  );
  TestValidator.equals("note updated", updatedItem.note, noteValue);

  // 4. Update the wishlist item with no properties (should not change the note)
  const updatedItem2 =
    await api.functional.shopping.customer.wishlists.items.update(connection, {
      wishlistId,
      itemId,
      body: {} satisfies IShoppingWishlistItem.IUpdate,
    });
  typia.assert(updatedItem2);
  TestValidator.equals(
    "note unchanged after empty update",
    updatedItem2.note,
    noteValue,
  );
  TestValidator.equals(
    "SKU still unchanged after empty update",
    updatedItem2.sku,
    createdItem.sku,
  );

  // 5. Update note to empty string (should clear note)
  const updatedItem3 =
    await api.functional.shopping.customer.wishlists.items.update(connection, {
      wishlistId,
      itemId,
      body: { note: "" } satisfies IShoppingWishlistItem.IUpdate,
    });
  typia.assert(updatedItem3);
  TestValidator.equals(
    "note cleared after update with empty string",
    updatedItem3.note,
    undefined,
  );

  // 6. Register another customer to test negative ownership
  const attackerReq = typia.random<IShoppingCustomer.ICreate>();
  const attacker = await api.functional.auth.customer.join(connection, {
    body: attackerReq,
  });
  typia.assert(attacker);

  // Switch context to attacker and try to update the item
  await TestValidator.error(
    "access forbidden for non-owner on update",
    async () => {
      await api.functional.shopping.customer.wishlists.items.update(
        connection,
        {
          wishlistId,
          itemId,
          body: {
            note: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IShoppingWishlistItem.IUpdate,
        },
      );
    },
  );
}
