import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_cart } from "../prepare/prepare_random_ecommerce_cart";

export async function generate_random_ecommerce_customer_carts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceCart.ICreate>;
  },
): Promise<IEcommerceCart> {
  const prepared: IEcommerceCart.ICreate = prepare_random_ecommerce_cart(
    props.body,
  );
  const result: IEcommerceCart =
    await api.functional.ecommerce.customer.carts.create(connection, {
      body: prepared,
    });
  return result;
}
