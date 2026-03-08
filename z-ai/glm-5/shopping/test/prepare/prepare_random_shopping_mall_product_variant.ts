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
    skuCode:
      input?.skuCode ??
      typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$|^[a-zA-Z0-9]{3}$">
      >(),
    optionValues: typia.assert<IShoppingMallProductVariant.ICreate["optionValues"]>(
      input?.optionValues ?? {
        color: RandomGenerator.pick([
          "Red",
          "Blue",
          "Green",
          "Black",
          "White",
        ] as const),
        size: RandomGenerator.pick([
          "Small",
          "Medium",
          "Large",
          "X-Large",
        ] as const),
      }
    ),
    price:
      input?.price ??
      typia.random<number & tags.Minimum<0.01> & tags.Maximum<999999.99>>(),
  };
}