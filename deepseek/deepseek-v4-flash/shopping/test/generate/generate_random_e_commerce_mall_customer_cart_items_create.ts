import api from "@ORGANIZATION/PROJECT-api";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
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
 * Prepares random cart item data using the prepare function, then calls the
 * cart item creation endpoint to add the variant to the customer's shopping
 * cart. If the same variant already exists in the cart, the quantities are
 * combined rather than creating a duplicate entry.
 *
 * The returned cart item includes the variant reference, current quantity,
 * unit price, subtotal, availability status, and system timestamps. The
 * optional body parameter allows overriding specific fields such as the
 * product variant ID or quantity for targeted test scenarios.
 *
 * @param connection - The API connection configuration
 * @param props.body - Optional partial overrides for the cart item creation
 *                     payload (uses DeepPartial matching the prepare function
 *                     input type)
 * @returns The created cart item record with full details
 */
export async function generate_random_e_commerce_mall_customer_cart_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallCartItem.ICreate> | undefined;
  }
): Promise<IECommerceMallCartItem> {
  const prepared: IECommerceMallCartItem.ICreate = prepare_random_ecommerce_mall_cart_item(
    props.body
  );
  return await api.functional.eCommerceMall.customer.cart_items.create(
    connection,
    {
      body: prepared,
    },
  );
}