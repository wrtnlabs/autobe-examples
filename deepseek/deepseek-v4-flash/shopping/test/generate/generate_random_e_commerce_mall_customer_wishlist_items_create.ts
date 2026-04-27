import api from "@ORGANIZATION/PROJECT-api";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallWishlistItem";
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
 * Prepares random wishlist item data using the prepare function, then calls the wishlist
 * creation endpoint to add a product to the customer's wishlist. The customer is identified
 * from the authenticated session, so only the product identifier needs to be provided.
 *
 * @param connection - The API connection configuration
 * @param props.body - Optional partial input to override random data generation
 * @returns The created wishlist item with its auto-generated ID, customer info, product summary, and timestamps
 */
export async function generate_random_e_commerce_mall_customer_wishlist_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallWishlistItem.ICreate> | undefined;
  },
): Promise<IECommerceMallWishlistItem> {
  const prepared: IECommerceMallWishlistItem.ICreate =
    prepare_random_ecommerce_mall_wishlist_item(props.body);
  return await api.functional.eCommerceMall.customer.wishlist_items.create(
    connection,
    {
      body: prepared,
    },
  );
}
