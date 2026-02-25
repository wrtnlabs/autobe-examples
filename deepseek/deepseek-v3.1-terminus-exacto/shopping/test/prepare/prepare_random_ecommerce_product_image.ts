import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_product_image(
  input?: DeepPartial<IEcommerceProductImage.ICreate>,
): IEcommerceProductImage.ICreate {
  return {
    image_url: input?.image_url ?? typia.random<string & tags.Format<"uri">>(),
    position:
      input?.position ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
