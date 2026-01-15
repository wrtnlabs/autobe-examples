import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
export function prepare_random_shopping_mall_order(
  input?: DeepPartial<IShoppingMallOrder.ICreate>,
): IShoppingMallOrder.ICreate {
  return {
    shipping_address_id:
      input?.shipping_address_id ??
      typia.random<string & tags.Format<"uuid">>(),
    payment_method_id:
      input?.payment_method_id ?? typia.random<string & tags.Format<"uuid">>(),
    ip:
      input?.ip ??
      `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>}`,
    href: input?.href ?? typia.random<string & tags.Format<"url">>(),
    referrer:
      input?.referrer ??
      `https://${RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<8>
        >(),
      )
        .replace(/(.{1,3})/g, "$1.")
        .replace(/\.$/, ".com")}`,
    customer_id:
      input?.customer_id ?? typia.random<string & tags.Format<"uuid">>(),
    cart_session_id:
      input?.cart_session_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
