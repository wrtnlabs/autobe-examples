import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
export function prepare_random_shopping_mall_shipping_method(
  input?: DeepPartial<IShoppingMallShippingMethod.ICreate>,
): IShoppingMallShippingMethod.ICreate {
  const deliveryDaysMin =
    input?.delivery_days_min ??
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
    >();
  return {
    code:
      input?.code ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      ),
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
        >(),
        wordMin: 2,
        wordMax: 8,
      }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 15,
      }),
    carrier_code:
      input?.carrier_code ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<50>
        >(),
      ),
    delivery_days_min: deliveryDaysMin,
    delivery_days_max:
      input?.delivery_days_max ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
      >(),
    cost_flat:
      input?.cost_flat ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<9999>>(),
  };
}