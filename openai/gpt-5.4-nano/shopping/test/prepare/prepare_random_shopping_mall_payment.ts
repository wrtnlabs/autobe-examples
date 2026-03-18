import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_payment(
  input?: DeepPartial<IShoppingMallPayment.ICreate> | undefined,
): IShoppingMallPayment.ICreate {
  return {
    amount: input?.amount ?? typia.random<number & tags.Minimum<0>>(),
    currency: input?.currency ?? typia.random<string & tags.MinLength<1>>(),
    provider: input?.provider ?? typia.random<string & tags.MinLength<1>>(),
    provider_reference:
      input?.provider_reference ?? typia.random<string & tags.MinLength<1>>(),
    orderPlacementContextId:
      input?.orderPlacementContextId ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
