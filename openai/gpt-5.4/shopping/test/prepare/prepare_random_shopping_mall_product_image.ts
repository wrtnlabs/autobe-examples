import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_image(
  input?: DeepPartial<IShoppingMallProductImage.ICreate>,
): IShoppingMallProductImage.ICreate {
  return {
    image_uri: input?.image_uri ?? typia.random<string & tags.Format<"uri">>(),
    sequence: input?.sequence ?? typia.random<number & tags.Type<"int32">>(),
    is_thumbnail: input?.is_thumbnail ?? typia.random<boolean>(),
  };
}
