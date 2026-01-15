import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallVariantAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttributeValue";
export function prepare_random_shopping_mall_variant_attribute_value(
  input?: DeepPartial<IShoppingMallVariantAttributeValue.ICreate> | undefined,
): IShoppingMallVariantAttributeValue.ICreate {
  return {
    attribute_type_id: typia.random<string & tags.Format<"uuid">>(),
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ??
      (RandomGenerator.pick([true, false] as const)
        ? RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 15 })
        : undefined),
    display_order:
      input?.display_order ??
      (RandomGenerator.pick([true, false] as const)
        ? typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>()
        : undefined),
    color_code:
      input?.color_code ??
      (RandomGenerator.pick([true, false, false, false, false] as const)
        ? typia.random<string & tags.Pattern<"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"> & tags.MaxLength<10>>()
        : undefined),
    usage_guidelines:
      input?.usage_guidelines ??
      (RandomGenerator.pick([true, false, false] as const)
        ? RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 5,
          })
        : undefined),
  };
}