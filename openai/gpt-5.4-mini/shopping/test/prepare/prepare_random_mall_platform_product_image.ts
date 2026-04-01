import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_mall_platform_product_image(
  input?: DeepPartial<IMallPlatformProductImage.ICreate> | undefined,
): IMallPlatformProductImage.ICreate {
  return {
    imageUrl:
      input?.imageUrl ??
      typia.random<string & tags.MaxLength<80000> & tags.Format<"url">>(),
    sortOrder: input?.sortOrder ?? typia.random<number & tags.Type<"int32">>(),
    isMain: input?.isMain ?? RandomGenerator.pick([true, false] as const),
  };
}
