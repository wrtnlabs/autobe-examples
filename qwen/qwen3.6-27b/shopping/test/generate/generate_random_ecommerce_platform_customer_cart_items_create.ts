import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_platform_shopping_cart_item } from "../prepare/prepare_random_ecommerce_platform_shopping_cart_item";

/**
 * Generate a random shopping cart item by adding a product variant to the authenticated customer's cart for E2E testing.
 *
 * Prepares random shopping cart item data including product variant UUID and quantity,
 * then calls the cart items creation endpoint via the API. If the same product variant
 * already exists in the customer's cart, the quantity is consolidated with the existing entry
 * rather than creating duplicate records.
 *
 * Requires prerequisites: category, product, and product variant must already exist
 * and be available in the system.
 */
export async function generate_random_ecommerce_platform_customer_cart_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformShoppingCartItem.ICreate>;
  },
): Promise<IEcommercePlatformShoppingCartItem> {
  const prepared: IEcommercePlatformShoppingCartItem.ICreate =
    prepare_random_ecommerce_platform_shopping_cart_item(props.body);
  const result: IEcommercePlatformShoppingCartItem =
    await api.functional.ecommercePlatform.customer.cart_items.create(
      connection,
      { body: prepared },
    );
  return result;
}
