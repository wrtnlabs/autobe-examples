import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_wishlist_item } from "../prepare/prepare_random_ecommerce_wishlist_item";

export async function generate_random_ecommerce_customer_wishlist_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceWishlistItem.ICreate> | undefined;
  },
): Promise<IEcommerceWishlistItem> {
  const prepared: IEcommerceWishlistItem.ICreate =
    prepare_random_ecommerce_wishlist_item(props.body);
  const result: IEcommerceWishlistItem =
    await api.functional.ecommerce.customer.wishlist_items.create(connection, {
      body: prepared,
    });
  return result;
}
