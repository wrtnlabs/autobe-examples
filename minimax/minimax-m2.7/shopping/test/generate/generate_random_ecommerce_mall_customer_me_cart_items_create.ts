import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_cart_item } from "../prepare/prepare_random_ecommerce_mall_cart_item";

/**
 * Generate a random cart item via the API for E2E testing.
 *
 * Adds a product variant to the authenticated customer's shopping cart. If the customer
 * does not have an existing cart, one is automatically created with the first item.
 * When the same product variant already exists in the cart, the quantities are combined
 * rather than creating a duplicate line item.
 *
 * The variant must exist and not be soft-deleted. Quantity must be at least 1. The
 * combined quantity is validated against available stock.
 *
 * @param connection - API connection with authentication
 * @param props.body - Optional overrides for random cart item data (quantity, productVariantId)
 * @returns The created or updated cart item with variant details
 */
export async function generate_random_ecommerce_mall_customer_me_cart_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCartItem.ICreate>;
  },
): Promise<IEcommerceMallCartItem> {
  const prepared: IEcommerceMallCartItem.ICreate =
    prepare_random_ecommerce_mall_cart_item(props.body);
  const result: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.me.cart.items.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
