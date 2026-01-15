import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
export function prepare_random_shopping_mall_product_category(
  input?: DeepPartial<IShoppingMallProductCategory.ICreate>,
): IShoppingMallProductCategory.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences:
          typia.random<number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>>(),
      }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 1 }),
    parentCategoryId:
      input?.parentCategoryId ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}