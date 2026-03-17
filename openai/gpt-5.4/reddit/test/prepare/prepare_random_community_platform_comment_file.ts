import { ICommunityPlatformCommentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_comment_file(
  input?: DeepPartial<ICommunityPlatformCommentFile.ICreate>,
): ICommunityPlatformCommentFile.ICreate {
  const mime_type =
    input?.mime_type ??
    RandomGenerator.pick([
      "image/jpeg",
      "image/png",
      "application/pdf",
      "text/plain",
    ] as const);
  const extension =
    (
      {
        "image/jpeg": "jpg",
        "image/png": "png",
        "application/pdf": "pdf",
        "text/plain": "txt",
      } as const
    )[mime_type] ?? "bin";
  return {
    original_name:
      input?.original_name ??
      `${RandomGenerator.alphaNumeric(12)}.${extension}`,
    mime_type,
    storage_key:
      input?.storage_key ??
      `community/comments/${RandomGenerator.alphaNumeric(8)}/${RandomGenerator.alphaNumeric(16)}`,
    size:
      input?.size ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
