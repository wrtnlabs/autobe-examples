import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_file(
  input?: DeepPartial<ICommunityPlatformFile.ICreate>,
): ICommunityPlatformFile.ICreate {
  const mimeType =
    input?.mime_type ??
    RandomGenerator.pick([
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ] as const);
  return {
    original_name:
      input?.original_name ??
      RandomGenerator.paragraph({ sentences: 2 }).substring(0, 254),
    mime_type: mimeType,
    file_size:
      input?.file_size ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5242880>
      >(),
    data: input?.data ?? RandomGenerator.alphaNumeric(100),
    width:
      input?.width !== undefined
        ? (input.width ?? undefined)
        : typia.random<
            number & tags.Type<"int32"> & tags.Minimum<64> & tags.Maximum<4096>
          >(),
    height:
      input?.height !== undefined
        ? (input.height ?? undefined)
        : typia.random<
            number & tags.Type<"int32"> & tags.Minimum<64> & tags.Maximum<4096>
          >(),
  };
}
