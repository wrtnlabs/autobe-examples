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
    url: input?.url ?? typia.random<string & tags.Format<"uri">>(),
    position:
      input?.position ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    altText:
      input?.altText ??
      RandomGenerator.paragraph({
        sentences:
          typia.random<number & tags.Minimum<2> & tags.Maximum<5>>(),
      }),
  };
}