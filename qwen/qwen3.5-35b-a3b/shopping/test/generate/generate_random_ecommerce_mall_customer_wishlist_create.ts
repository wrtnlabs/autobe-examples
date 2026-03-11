import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_wishlist } from "../prepare/prepare_random_ecommerce_mall_wishlist";

export async function generate_random_ecommerce_mall_customer_wishlist_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallWishlist.ICreate> | undefined;
  },
): Promise<IEcommerceMallWishlist> {
  const prepared: IEcommerceMallWishlist.ICreate =
    prepare_random_ecommerce_mall_wishlist(props.body);
  const result: IEcommerceMallWishlist =
    await api.functional.ecommerceMall.customer.wishlist.create(connection, {
      body: prepared,
    });
  return result;
}
