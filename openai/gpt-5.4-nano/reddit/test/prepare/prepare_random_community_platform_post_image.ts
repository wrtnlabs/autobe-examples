import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_image(
  input?: DeepPartial<ICommunityPlatformPostImage.ICreate> | undefined,
): ICommunityPlatformPostImage.ICreate {
  return {
    file_url: input?.file_url ?? typia.random<string & tags.Format<"uri">>(),
    content_type:
      input?.content_type ??
      RandomGenerator.pick([
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ] as const),
    file_size_bytes:
      input?.file_size_bytes ?? typia.random<number & tags.Type<"int32">>(),
    image_width_px:
      input?.image_width_px ?? typia.random<number & tags.Type<"int32">>(),
    image_height_px:
      input?.image_height_px ?? typia.random<number & tags.Type<"int32">>(),
    alt_text: input?.alt_text ?? RandomGenerator.paragraph({ sentences: 1 }),
    sort_order:
      input?.sort_order ?? typia.random<number & tags.Type<"int32">>(),
  };
}
