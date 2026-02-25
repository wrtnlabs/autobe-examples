import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrier";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_shipping_carrier(
  input?: DeepPartial<IShoppingMallShippingCarrier.ICreate>,
): IShoppingMallShippingCarrier.ICreate {
  return {
    code:
      input?.code ??
      RandomGenerator.alphaNumeric(
        RandomGenerator.pick([4, 5, 6, 7, 8] as const),
      ),
    name: input?.name ?? RandomGenerator.name(),
    api_endpoint:
      input?.api_endpoint ??
      `https://api.${RandomGenerator.name(1).toLowerCase()}.com/${RandomGenerator.name(1).toLowerCase()}`,
    api_key: input?.api_key ?? RandomGenerator.alphaNumeric(32),
    api_secret: input?.api_secret ?? RandomGenerator.alphaNumeric(32),
    account_number:
      input?.account_number ??
      (Math.random() < 0.3 ? null : RandomGenerator.alphaNumeric(10)),
    is_enabled:
      input?.is_enabled ?? RandomGenerator.pick([true, false] as const),
  };
}
