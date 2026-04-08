import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
 * Generate a random shopping cart item via the API for E2E testing.
 *
 * Prepares random cart item data using the prepare function, then calls the cart creation endpoint
 * to add an item to the authenticated customer's shopping cart. The response includes the complete
 * cart state with all items and calculated totals including subtotals per item and grand total.
 *
 * Note: This operation does not reserve inventory - items can be added to cart even if stock is 0.
 * The variant must exist and not be soft-deleted.
 *
 * @param connection - API connection context
 * @param props - Optional body parameters to override generated data
 * @returns The complete cart with the newly added item
 */
export async function generate_random_ecommerce_mall_customer_me_cart_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCartItem.ICreate>;
  }
): Promise<IEcommerceMallCart> {
  const prepared: IEcommerceMallCartItem.ICreate = prepare_random_ecommerce_mall_cart_item(
    props.body
  );
  const result: IEcommerceMallCart = await api.functional.ecommerceMall.customer.me.cart.create(
    connection,
    {
      body: prepared,
    }
  );
  return result;
}