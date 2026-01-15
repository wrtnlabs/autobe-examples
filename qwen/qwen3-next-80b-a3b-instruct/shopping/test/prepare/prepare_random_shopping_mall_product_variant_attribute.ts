import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttribute";
export function prepare_random_shopping_mall_product_variant_attribute(
  input?: DeepPartial<IShoppingMallProductVariantAttribute.ICreate> | undefined,
): IShoppingMallProductVariantAttribute.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<6>
        >(),
        wordMin: 4,
        wordMax: 8,
      }),
    type:
      input?.type ??
      RandomGenerator.pick(["string", "boolean", "number", "enum"] as const),
    deprecated:
      input?.deprecated ?? RandomGenerator.pick([true, false] as const),
    displayPriority:
      input?.displayPriority ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<-10000> & tags.Maximum<10000>
      >(),
    requireValidation:
      input?.requireValidation ?? RandomGenerator.pick([true, false] as const),
  };
}
