import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_cart_item } from "../prepare/prepare_random_ecommerce_cart_item";

export async function generate_random_ecommerce_customer_carts_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceCartItem.ICreate>;
    params: {
      cartId: string & tags.Format<"uuid">;
    };
  },
): Promise<IEcommerceCartItem> {
  const prepared: IEcommerceCartItem.ICreate =
    prepare_random_ecommerce_cart_item(props.body);
  const result: IEcommerceCartItem =
    await api.functional.ecommerce.customer.carts.items.create(connection, {
      cartId: props.params.cartId,
      body: prepared,
    });
  return result;
}
