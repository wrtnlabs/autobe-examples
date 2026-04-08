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
 * Generate a random wishlist item by adding a product to the authenticated customer's wishlist for E2E testing.
 *
 * Prepares random wishlist item creation data using the prepare function, then calls the wishlist creation endpoint.
 * The productId must reference an existing, non-deleted product in the catalog.
 * If the product is already in the customer's wishlist, the operation returns a 409 conflict error.
 *
 * @param connection - API connection instance
 * @param props - Optional body overrides for wishlist item creation
 * @returns The newly created wishlist item with product details
 */
export async function generate_random_ecommerce_mall_customer_customers_me_wishlist_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallWishlistItem.ICreate>;
  },
): Promise<IEcommerceMallWishlistItem> {
  const prepared: IEcommerceMallWishlistItem.ICreate =
    prepare_random_ecommerce_mall_wishlist_item(props.body);
  const result: IEcommerceMallWishlistItem =
    await api.functional.ecommerceMall.customer.customers.me.wishlist.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
