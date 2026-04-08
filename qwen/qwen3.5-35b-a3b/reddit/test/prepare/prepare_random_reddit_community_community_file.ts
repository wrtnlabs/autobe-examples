import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit community community file creation data for E2E testing.
 *
 * Generates a complete IRedditCommunityCommunityFile.ICreate with randomized values
 * for testing community file asset registration. Creates realistic file metadata
 * including storage paths, filenames, MIME types, and file sizes.
 */
export function prepare_random_reddit_community_community_file(
  input?: DeepPartial<IRedditCommunityCommunityFile.ICreate> | undefined,
): IRedditCommunityCommunityFile.ICreate {
  return {
    file_path:
      input?.file_path ??
      typia.random<string & tags.Format<"uri"> & tags.MaxLength<80000>>(),
    filename: input?.filename ?? RandomGenerator.alphabets(10),
    mime_type:
      input?.mime_type ??
      RandomGenerator.pick([
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/svg+xml",
      ] as const),
    file_size:
      input?.file_size ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
