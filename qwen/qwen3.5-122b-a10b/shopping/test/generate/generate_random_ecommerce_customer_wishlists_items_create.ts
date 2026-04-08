import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlist";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_wishlist_item } from "../prepare/prepare_random_ecommerce_wishlist_item";

/**
 * Generate a random wishlist item via the API for E2E testing.
 *
 * Prepares random wishlist item data using the prepare function, then calls the creation endpoint to add a product to a customer's wishlist.
 *
 * This function creates a wishlist item record that links a product to a customer's wishlist, allowing customers to save products they are interested in for potential future purchase. The function requires a valid wishlistId to specify which customer's wishlist to add the item to.
 *
 * **Business Rules Enforced by API**
 *
 * - Each customer has exactly one personal wishlist
 * - A product can only appear once in a wishlist; duplicate additions return a conflict error (409)
 * - Only the wishlist owner can add items to their wishlist
 * - The referenced product must exist and be available on the platform
 * - Products are automatically removed from all wishlists when deleted by the seller
 *
 * @param connection The HTTP connection configuration for API requests
 * @param props.body Optional partial input to override specific properties in the wishlist item creation data
 * @param props.params.wishlistId UUID identifier of the customer's wishlist to add the item to
 * @returns The created wishlist item record with all fields including timestamps and references
 * @throws {HttpError} When the API request fails (e.g., invalid wishlistId, product not found, duplicate item, unauthorized access)
 */
export async function generate_random_ecommerce_customer_wishlists_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceWishlistItem.ICreate>;
    params: {
      wishlistId: string;
    };
  },
): Promise<IEcommerceWishlistItem> {
  const prepared: IEcommerceWishlistItem.ICreate =
    prepare_random_ecommerce_wishlist_item(props.body);
  const result: IEcommerceWishlistItem =
    await api.functional.ecommerce.customer.wishlists.items.create(connection, {
      wishlistId: props.params.wishlistId,
      body: prepared,
    });
  return result;
}
