import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallVariantTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantTemplate";
import { IShoppingMallVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttribute";
import { IShoppingMallVariantAttributeValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttributeValidation";
import { IShoppingMallVariantCompatibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantCompatibility";
export function prepare_random_shopping_mall_variant_template(
  input?: DeepPartial<IShoppingMallVariantTemplate.ICreate>,
): IShoppingMallVariantTemplate.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
        >(),
        wordMin: 3,
        wordMax: 7,
      }),
    description:
      input?.description ??
      (input?.description === null
        ? undefined
        : RandomGenerator.content({
            paragraphs: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
            sentenceMin: 5,
            sentenceMax: 10,
          })),
    is_active:
      input?.is_active ??
      RandomGenerator.pick([
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        false,
        false,
      ] as const),
    attribute_configs: input?.attribute_configs
      ? input.attribute_configs.map((attr) => ({
          name:
            attr.name ??
            RandomGenerator.alphabets(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<4> &
                  tags.Maximum<10>
              >(),
            ),
          type:
            attr.type ??
            RandomGenerator.pick([
              "select",
              "text",
              "number",
              "boolean",
              "date",
            ] as const),
          description:
            attr.description ??
            (attr.description === null
              ? undefined
              : RandomGenerator.paragraph({
                  sentences: typia.random<
                    number &
                      tags.Type<"uint32"> &
                      tags.Minimum<1> &
                      tags.Maximum<3>
                  >(),
                  wordMin: 3,
                  wordMax: 8,
                })),
          required:
            attr.required ?? RandomGenerator.pick([true, false] as const),
          validation: attr.validation
            ? {
                min:
                  attr.validation.min ??
                  typia.random<
                    number &
                      tags.Type<"int32"> &
                      tags.Minimum<0> &
                      tags.Maximum<10000>
                  >(),
                max:
                  attr.validation.max ??
                  typia.random<
                    number &
                      tags.Type<"int32"> &
                      tags.Minimum<0> &
                      tags.Maximum<10000>
                  >(),
                minLength:
                  attr.validation.minLength ??
                  typia.random<
                    number &
                      tags.Type<"int32"> &
                      tags.Minimum<0> &
                      tags.Maximum<250>
                  >(),
                maxLength:
                  attr.validation.maxLength ??
                  typia.random<
                    number &
                      tags.Type<"int32"> &
                      tags.Minimum<0> &
                      tags.Maximum<500>
                  >(),
                pattern:
                  attr.validation.pattern ??
                  (attr.validation.pattern === null
                    ? undefined
                    : attr.validation.pattern),
                minDate:
                  attr.validation.minDate ??
                  typia.random<string & tags.Format<"date">>(),
                maxDate:
                  attr.validation.maxDate ??
                  typia.random<string & tags.Format<"date">>(),
                step:
                  attr.validation.step ??
                  typia.random<number & tags.Type<"float">>(),
                required:
                  attr.validation.required ??
                  RandomGenerator.pick([true, false] as const),
              }
            : attr.validation === null
            ? {
                min: undefined,
                max: undefined,
                minLength: undefined,
                maxLength: undefined,
                pattern: undefined,
                minDate: undefined,
                maxDate: undefined,
                step: undefined,
                required: undefined,
              }
            : {
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
                minLength: typia.random<
                  number &
                    tags.Type<"int32"> &
                    tags.Minimum<0> &
                    tags.Maximum<250>
                >(),
                maxLength: typia.random<
                  number &
                    tags.Type<"int32"> &
                    tags.Minimum<0> &
                    tags.Maximum<500>
                >(),
                pattern: undefined,
                minDate: typia.random<string & tags.Format<"date">>(),
                maxDate: typia.random<string & tags.Format<"date">>(),
                step: typia.random<number & tags.Type<"float">>(),
                required: RandomGenerator.pick([true, false] as const),
              },
          category_id:
            attr.category_id ?? typia.random<string & tags.Format<"uuid">>(),
          product_id:
            attr.product_id ?? typia.random<string & tags.Format<"uuid">>(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            name: RandomGenerator.alphabets(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<4> &
                  tags.Maximum<10>
              >(),
            ),
            type: RandomGenerator.pick([
              "select",
              "text",
              "number",
              "boolean",
              "date",
            ] as const),
            description: RandomGenerator.paragraph({
              sentences: typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
              >(),
              wordMin: 3,
              wordMax: 8,
            }),
            required: RandomGenerator.pick([true, false] as const),
            validation: {
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
              minLength: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<0> &
                  tags.Maximum<250>
              >(),
              maxLength: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<0> &
                  tags.Maximum<500>
              >(),
              pattern: undefined,
              minDate: typia.random<string & tags.Format<"date">>(),
              maxDate: typia.random<string & tags.Format<"date">>(),
              step: typia.random<number & tags.Type<"float">>(),
              required: RandomGenerator.pick([true, false] as const),
            },
            category_id: typia.random<string & tags.Format<"uuid">>(),
            product_id: typia.random<string & tags.Format<"uuid">>(),
          }),
        ),
    compatibility_rules: input?.compatibility_rules
      ? input.compatibility_rules.map((rule) => ({
          items: rule.items && Array.isArray(rule.items)
            ? rule.items.map(
                (item) => item ?? typia.random<string & tags.Format<"uuid">>(),
              )
            : [],
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<2>
          >(),
          () => ({
            items: ArrayUtil.repeat(
              typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
              >(),
              () => typia.random<string & tags.Format<"uuid">>(),
            ),
          }),
        ),
  };
}