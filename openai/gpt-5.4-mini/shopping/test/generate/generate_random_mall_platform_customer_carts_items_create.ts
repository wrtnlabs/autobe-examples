import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_cart_item } from "../prepare/prepare_random_mall_platform_cart_item";

/**
 * Generate a random mall platform cart item via the API for E2E testing.
 *
 * Prepares cart-item creation data with the prepare function, then adds the
 * selected product variant to the authenticated customer's cart through the API.
 * The generated cart item is returned exactly as created by the service.
 */
export async function generate_random_mall_platform_customer_carts_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformCartItem.ICreate> | undefined;
    params: {
      cartId: string;
    };
  },
): Promise<IMallPlatformCartItem> {
  const prepared: IMallPlatformCartItem.ICreate =
    prepare_random_mall_platform_cart_item(props.body);
  return await api.functional.mallPlatform.customer.carts.items.create(
    connection,
    {
      body: prepared,
      cartId: props.params.cartId,
    },
  );
}
