import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_wishlist_item } from "../prepare/prepare_random_ecommerce_mall_wishlist_item";

/**
 * Generate a random wishlist item for E2E testing.
 *
 * Prepares random wishlist item data using the prepare function, then calls
 * the wishlist creation endpoint to add a product to the authenticated customer's
 * wishlist. The productId is required and must reference an existing, non-deleted
 * product in the catalog.
 *
 * @param connection - API connection for authentication
 * @param props.body - Optional DeepPartial override for test customization
 * @returns The created wishlist item with product details
 */
export async function generate_random_ecommerce_mall_customer_wishlist_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallWishlistItem.ICreate>;
  },
): Promise<IEcommerceMallWishlistItem> {
  const prepared: IEcommerceMallWishlistItem.ICreate =
    prepare_random_ecommerce_mall_wishlist_item(props.body);
  const result: IEcommerceMallWishlistItem =
    await api.functional.ecommerceMall.customer.wishlist.create(connection, {
      body: prepared,
    });
  return result;
}
