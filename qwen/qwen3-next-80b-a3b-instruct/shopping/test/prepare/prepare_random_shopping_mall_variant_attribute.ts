import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttribute";
import { IShoppingMallVariantAttributeValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttributeValidation";
export function prepare_random_shopping_mall_variant_attribute(
  input?: DeepPartial<IShoppingMallVariantAttribute.ICreate>,
): IShoppingMallVariantAttribute.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ wordMin: 1, wordMax: 8, sentences: 1 }),
    description:
      input?.description ??
      (RandomGenerator.paragraph({
        wordMin: 3,
        wordMax: 10,
        sentences: 2,
      }) as string & tags.MaxLength<500>),
    type:
      input?.type ??
      RandomGenerator.pick([
        "select",
        "text",
        "number",
        "boolean",
        "date",
      ] as const),
    required: input?.required ?? RandomGenerator.pick([true, false] as const),
    validation: input?.validation
      ? input.validation
      : (() => {
          const type =
            input?.type ??
            RandomGenerator.pick([
              "select",
              "text",
              "number",
              "boolean",
              "date",
            ] as const);
          if (type === "number") {
            return {
              min: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<0> &
                  tags.Maximum<10000>
              >(),
              max: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<0> &
                  tags.Maximum<10000>
              >(),
              step: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<0> &
                  tags.Maximum<100>
              >(),
            };
          }
          if (type === "text") {
            return {
              minLength: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<50>
              >(),
              maxLength: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<0> &
                  tags.Maximum<255>
              >(),
              pattern: typia.random<string & tags.Pattern<"^[a-zA-Z0-9_]+$">>(),
            };
          }
          if (type === "date") {
            const now = Date.now();
            const minDate = new Date(now - 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0] as string & tags.Format<"date">;
            const maxDate = new Date(now + 365 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0] as string & tags.Format<"date">;
            return {
              minDate,
              maxDate,
            };
          }
          return undefined;
        })(),
    category_id:
      input?.category_id ?? typia.random<string & tags.Format<"uuid">>(),
    product_id:
      input?.product_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}