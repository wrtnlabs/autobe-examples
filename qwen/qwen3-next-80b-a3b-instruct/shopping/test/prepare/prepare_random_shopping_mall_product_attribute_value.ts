import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
export function prepare_random_shopping_mall_product_attribute_value(
  input?: DeepPartial<IShoppingMallProductAttributeValue.ICreate> | undefined,
): IShoppingMallProductAttributeValue.ICreate {
  return {
    value:
      input?.value ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<20>
        >(),
      ),
  };
}
