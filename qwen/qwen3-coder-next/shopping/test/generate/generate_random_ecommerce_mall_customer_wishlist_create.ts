import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_wishlist_item } from "../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function generate_random_ecommerce_mall_customer_wishlist_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallWishlistItem.ICreate>;
    params: {
      productId: string;
    };
  },
): Promise<IEcommerceMallWishlistItem> {
  const prepared: IEcommerceMallWishlistItem.ICreate =
    prepare_random_ecommerce_mall_wishlist_item(props.body);
  return await api.functional.ecommerceMall.customer.wishlist.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
