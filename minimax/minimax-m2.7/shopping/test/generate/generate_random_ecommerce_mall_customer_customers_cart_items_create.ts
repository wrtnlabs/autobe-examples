import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { prepare_random_ecommerce_mall_cart_item } from "../prepare/prepare_random_ecommerce_mall_cart_item";

export async function generate_random_ecommerce_mall_customer_customers_cart_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCartItem.ICreate>;
  }
): Promise<IEcommerceMallCart> {
  const prepared: IEcommerceMallCartItem.ICreate = prepare_random_ecommerce_mall_cart_item(
    props.body,
  );
  const result: IEcommerceMallCart = await api.functional.ecommerceMall.customer.customers.cart.items.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}