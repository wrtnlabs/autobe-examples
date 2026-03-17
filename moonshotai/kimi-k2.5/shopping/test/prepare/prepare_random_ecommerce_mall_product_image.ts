import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_product_image(
  input?: DeepPartial<IEcommerceMallProductImage.ICreate> | undefined,
): IEcommerceMallProductImage.ICreate {
  return {
    imageUrl: input?.imageUrl ?? typia.random<string & tags.Format<"uri">>(),
  };
}
