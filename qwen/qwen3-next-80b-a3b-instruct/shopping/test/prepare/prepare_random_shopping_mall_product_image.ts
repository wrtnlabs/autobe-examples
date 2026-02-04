import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
export function prepare_random_shopping_mall_product_image(
  input?: DeepPartial<IShoppingMallProductImage.ICreate>,
): IShoppingMallProductImage.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>
        >(),
      ),
    extension:
      input?.extension ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      ),
    url:
      input?.url ??
      `https://cdn.example.com/files/${RandomGenerator.alphabets(typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<255>>())}.${RandomGenerator.alphabets(typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>>())}`,
  };
}
