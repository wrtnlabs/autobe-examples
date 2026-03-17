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
    storage_uri:
      input?.storage_uri ?? typia.random<string & tags.Format<"uri">>(),
    original_name:
      input?.original_name ?? `${RandomGenerator.alphaNumeric(12)}.jpg`,
    mime_type:
      input?.mime_type ??
      RandomGenerator.pick([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ] as const),
    byte_size:
      input?.byte_size ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    width:
      input?.width !== undefined
        ? input.width
        : RandomGenerator.pick([640, 800, 1024, 1200, 1280, 1920] as const),
    height:
      input?.height !== undefined
        ? input.height
        : RandomGenerator.pick([480, 600, 768, 900, 1080, 1440] as const),
  };
}
