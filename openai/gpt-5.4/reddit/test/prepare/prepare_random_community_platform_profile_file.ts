import { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_profile_file(
  input?: DeepPartial<ICommunityPlatformProfileFile.ICreate>,
): ICommunityPlatformProfileFile.ICreate {
  const extension =
    input?.extension ??
    RandomGenerator.pick(["jpg", "jpeg", "png", "webp"] as const);
  const mime_type =
    input?.mime_type ??
    {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    }[extension] ??
    RandomGenerator.pick(["image/jpeg", "image/png", "image/webp"] as const);
  const original_name =
    input?.original_name ?? `${RandomGenerator.alphabets(8)}.${extension}`;
  const url =
    input?.url ??
    `https://storage.example.com/profile-files/${RandomGenerator.alphaNumeric(12)}/${original_name}`;
  return {
    category:
      input?.category ??
      RandomGenerator.pick(["avatar", "profile_image", "thumbnail"] as const),
    original_name,
    extension,
    mime_type,
    size:
      input?.size ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    url,
  };
}
