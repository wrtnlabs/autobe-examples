import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_cart_item } from "../prepare/prepare_random_ecommerce_mall_cart_item";

export async function generate_random_ecommerce_mall_customer_cart_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCartItem.ICreate> | undefined;
  },
): Promise<IEcommerceMallCartItem> {
  const prepared: IEcommerceMallCartItem.ICreate =
    prepare_random_ecommerce_mall_cart_item(props.body);
  return await api.functional.ecommerceMall.customer.cart.items.create(
    connection,
    {
      body: prepared,
    },
  );
}
