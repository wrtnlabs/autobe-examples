import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_cart_item } from "../prepare/prepare_random_ecommerce_mall_cart_item";

/**
 * Add a product variant to the authenticated customer's shopping cart.
 *
 * @param connection - The API connection
 * @param props - Optional DeepPartial input to override random values
 * @returns The created or updated cart item with product details
 */
export async function generate_random_ecommerce_mall_customer_cart_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCartItem.ICreate>;
  },
): Promise<IEcommerceMallCartItem> {
  const prepared: IEcommerceMallCartItem.ICreate =
    prepare_random_ecommerce_mall_cart_item(props.body);
  const result: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.cart.items.create(connection, {
      body: prepared,
    });
  return result;
}
