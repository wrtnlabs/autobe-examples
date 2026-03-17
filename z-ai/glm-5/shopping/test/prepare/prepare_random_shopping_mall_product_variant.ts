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
    sku_code:
      input?.sku_code ??
      typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$">
      >(),
    option_values: input?.option_values
      ? Object.fromEntries(
          Object.entries(input.option_values).filter(
            (entry): entry is [string, string] => entry[1] !== undefined,
          ),
        )
      : typia.random<Record<string, string>>(),
    price:
      input?.price !== undefined
        ? input.price
        : Math.random() < 0.3
          ? null
          : typia.random<
              number & tags.Minimum<0.01> & tags.Maximum<999999.99>
            >(),
  };
}
