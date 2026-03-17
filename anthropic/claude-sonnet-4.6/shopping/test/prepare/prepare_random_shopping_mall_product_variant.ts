import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_variant(
  input?: DeepPartial<IShoppingMallProductVariant.ICreate> | undefined,
): IShoppingMallProductVariant.ICreate {
  return {
    sku: input?.sku ?? RandomGenerator.alphaNumeric(12),
    priceOverride:
      input?.priceOverride !== undefined
        ? input.priceOverride
        : typia.random<
            number &
              tags.Type<"double"> &
              tags.ExclusiveMinimum<0> &
              tags.Maximum<999999>
          >(),
    options: input?.options
      ? input.options.map((option) => ({
          id: option.id ?? typia.random<string & tags.Format<"uuid">>(),
          product_variant_id:
            option.product_variant_id ??
            typia.random<string & tags.Format<"uuid">>(),
          key: option.key ?? RandomGenerator.alphabets(6),
          value: option.value ?? RandomGenerator.alphabets(8),
          sequence:
            option.sequence ?? typia.random<number & tags.Type<"int32">>(),
          created_at:
            option.created_at ??
            typia.random<string & tags.Format<"date-time">>(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            id: typia.random<string & tags.Format<"uuid">>(),
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            key: RandomGenerator.alphabets(6),
            value: RandomGenerator.alphabets(8),
            sequence: typia.random<number & tags.Type<"int32">>(),
            created_at: typia.random<string & tags.Format<"date-time">>(),
          }),
        ),
  };
}
