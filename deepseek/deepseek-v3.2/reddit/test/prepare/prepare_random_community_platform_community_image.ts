import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_image(
  input?: DeepPartial<ICommunityPlatformCommunityImage.ICreate> | undefined,
): ICommunityPlatformCommunityImage.ICreate {
  // Generate content_type if not provided
  const content_type =
    input?.content_type ??
    RandomGenerator.pick(["image/jpeg", "image/png", "image/gif"] as const);
  // Determine filename extension based on content_type
  const extension =
    content_type === "image/jpeg"
      ? "jpg"
      : content_type === "image/png"
        ? "png"
        : "gif";
  return {
    uri:
      input?.uri ??
      typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
    filename:
      input?.filename ?? RandomGenerator.alphaNumeric(20) + "." + extension,
    content_type,
    width:
      input?.width ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
      >(),
    height:
      input?.height ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
      >(),
    size_bytes:
      input?.size_bytes ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<2097152>
      >(),
    ordering:
      input?.ordering ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    active: input?.active ?? RandomGenerator.pick([true, false] as const),
  };
}
