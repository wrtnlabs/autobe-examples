import { ICommunityPlatformCommentSnapshotFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshotFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_comment_snapshot_file(
  input?:
    | DeepPartial<ICommunityPlatformCommentSnapshotFile.ICreate>
    | undefined,
): ICommunityPlatformCommentSnapshotFile.ICreate {
  const fileType = RandomGenerator.pick([
    { extension: "png", mime: "image/png" },
    { extension: "jpg", mime: "image/jpeg" },
    { extension: "pdf", mime: "application/pdf" },
    { extension: "txt", mime: "text/plain" },
  ] as const);
  return {
    original_name:
      input?.original_name ??
      `${RandomGenerator.alphaNumeric(12)}.${fileType.extension}`,
    mime_type: input?.mime_type ?? fileType.mime,
    storage_key:
      input?.storage_key ??
      `comment-snapshots/${RandomGenerator.alphaNumeric(8)}/${RandomGenerator.alphaNumeric(16)}`,
    size: input?.size ?? typia.random<number & tags.Type<"int32">>(),
  };
}
