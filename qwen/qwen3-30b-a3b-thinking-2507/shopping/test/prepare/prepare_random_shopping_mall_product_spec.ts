import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSpec } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSpec";

export function prepare_random_shopping_mall_product_spec(
  input?: DeepPartial<IShoppingMallProductSpec.ICreate>,
): IShoppingMallProductSpec.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: typia.random<number>(),
      }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: typia.random<number>(),
      }),
    value:
      input?.value ??
      RandomGenerator.paragraph({
        sentences: typia.random<number>(),
      }),
    order:
      input?.order ??
      typia.random<number>(),
  };
}