import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_variant(
  input?: DeepPartial<IShoppingMallProductVariant.ICreate> | undefined,
): IShoppingMallProductVariant.ICreate {
  return {
    sku_code:
      input?.sku_code ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<20>
        >(),
      ),
    price:
      input?.price ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<10000>>(),
    options: input?.options
      ? input.options.map((option) => ({
          option_name:
            option.option_name ??
            RandomGenerator.alphabets(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<5> &
                  tags.Maximum<15>
              >(),
            ),
          option_value:
            option.option_value ??
            RandomGenerator.alphabets(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<5> &
                  tags.Maximum<15>
              >(),
            ),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            option_name: RandomGenerator.alphabets(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<5> &
                  tags.Maximum<15>
              >(),
            ),
            option_value: RandomGenerator.alphabets(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<5> &
                  tags.Maximum<15>
              >(),
            ),
          }),
        ),
  };
}
