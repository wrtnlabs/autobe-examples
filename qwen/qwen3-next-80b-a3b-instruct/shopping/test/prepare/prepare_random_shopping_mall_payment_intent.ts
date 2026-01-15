import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentIntent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntent";
export function prepare_random_shopping_mall_payment_intent(
  input?: DeepPartial<IShoppingMallPaymentIntent.ICreate>,
): IShoppingMallPaymentIntent.ICreate {
  return {
    amount:
      input?.amount ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0.01> & tags.Maximum<10000>
      >(),
    currency:
      input?.currency ?? typia.random<string & tags.Pattern<"^[A-Z]{3}$">>(),
    payment_method_id:
      input?.payment_method_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
