import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_image(
  input?: DeepPartial<IShoppingMallProductImage.ICreate> | undefined,
): IShoppingMallProductImage.ICreate {
  return {
    imageUri: input?.imageUri ?? typia.random<string & tags.Format<"url">>(),
    displayOrder:
      input?.displayOrder ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    altText:
      input?.altText === undefined
        ? RandomGenerator.paragraph({ sentences: 1 })
        : input.altText,
  };
}
