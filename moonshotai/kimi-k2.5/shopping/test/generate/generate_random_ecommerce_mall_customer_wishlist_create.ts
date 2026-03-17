import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_wishlist_item } from "../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function generate_random_ecommerce_mall_customer_wishlist_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallWishlistItem.ICreate> | undefined;
  },
): Promise<IEcommerceMallWishlistItem> {
  const prepared: IEcommerceMallWishlistItem.ICreate =
    prepare_random_ecommerce_mall_wishlist_item(props.body);
  const result: IEcommerceMallWishlistItem =
    await api.functional.ecommerceMall.customer.wishlist.create(connection, {
      body: prepared,
    });
  return result;
}
