import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_variant(
  input?: DeepPartial<IShoppingMallProductVariant.ICreate>,
): IShoppingMallProductVariant.ICreate {
  return {
    sku: input?.sku ?? `SKU-${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    options: input?.options
      ? input.options
      : Object.fromEntries(
          ArrayUtil.repeat(
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
            () =>
              [
                `option_${RandomGenerator.alphabets(3)}`,
                RandomGenerator.paragraph({
                  sentences: typia.random<
                    number &
                      tags.Type<"uint32"> &
                      tags.Minimum<1> &
                      tags.Maximum<5>
                  >(),
                }),
              ] as [string, string],
          ),
        ),
    price:
      input?.price ??
      typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
    stockQuantity:
      input?.stockQuantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
