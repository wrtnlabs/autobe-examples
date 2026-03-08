import { ICommunityPlatformAvatarFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAvatarFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_avatar_file(
  input?: DeepPartial<ICommunityPlatformAvatarFile.ICreate>,
): ICommunityPlatformAvatarFile.ICreate {
  return {
    file: input?.file ?? RandomGenerator.alphaNumeric(100),
    originalName: input?.originalName ?? `${RandomGenerator.name(1)}.jpg`,
    mimeType:
      input?.mimeType ??
      RandomGenerator.pick([
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ] as const),
    width:
      input?.width ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<64> & tags.Maximum<4096>
      >(),
    height:
      input?.height ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<64> & tags.Maximum<4096>
      >(),
  };
}
