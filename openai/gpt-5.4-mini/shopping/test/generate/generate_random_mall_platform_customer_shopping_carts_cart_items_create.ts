import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import type { IMallPlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_shopping_cart_item } from "../prepare/prepare_random_mall_platform_shopping_cart_item";

/**
 * Generate a random mall platform shopping cart item via the API for E2E testing.
 *
 * Prepares valid shopping cart item creation data using the dedicated prepare function, then calls the authenticated customer cart-item creation endpoint and returns the persisted cart item.
 */
export async function generate_random_mall_platform_customer_shopping_carts_cart_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformShoppingCartItem.ICreate> | undefined;
  },
): Promise<IMallPlatformShoppingCartItem> {
  const prepared: IMallPlatformShoppingCartItem.ICreate =
    prepare_random_mall_platform_shopping_cart_item(props.body);
  return await api.functional.mallPlatform.customer.shopping_carts.cart_items.create(
    connection,
    {
      body: prepared,
    },
  );
}
