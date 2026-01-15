import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrier";
export function prepare_random_shopping_mall_carrier(
  input?: DeepPartial<IShoppingMallCarrier.ICreate>,
): IShoppingMallCarrier.ICreate {
  return {
    carrier_name:
      input?.carrier_name ??
      RandomGenerator.name(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      ),
    carrier_code:
      input?.carrier_code ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<15>
        >(),
      ).toUpperCase(),
    delivery_enabled:
      input?.delivery_enabled ?? RandomGenerator.pick([true, false] as const),
    max_weight_kg:
      input?.max_weight_kg ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>
      >(),
    max_volume_m3:
      input?.max_volume_m3 ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0.1> & tags.Maximum<100>
      >(),
    estimated_transit_days:
      input?.estimated_transit_days ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<60>
      >(),
    supported_currencies:
      input?.supported_currencies ??
      ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        () => RandomGenerator.alphabets(3).toUpperCase(),
      ),
    api_integration_url:
      input?.api_integration_url ?? typia.random<string & tags.Format<"uri">>(),
    api_key:
      input?.api_key ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<512>
        >(),
      ),
    username:
      input?.username ??
      (RandomGenerator.pick([true, false] as const)
        ? RandomGenerator.name(1)
        : undefined),
    password:
      input?.password ??
      (input?.username !== undefined
        ? RandomGenerator.alphaNumeric(
            typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<30> &
                tags.Maximum<256>
            >(),
          )
        : undefined),
  };
}
