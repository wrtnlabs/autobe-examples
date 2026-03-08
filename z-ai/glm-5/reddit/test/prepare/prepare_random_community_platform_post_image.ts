import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_image(
  input?: DeepPartial<ICommunityPlatformPostImage.ICreate>,
): ICommunityPlatformPostImage.ICreate {
  return {
    fileUrl: input?.fileUrl ?? typia.random<string & tags.Format<"uri">>(),
    order:
      input?.order ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  };
}
