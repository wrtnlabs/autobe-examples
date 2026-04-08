import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random reddit community post file creation data for E2E testing.
 *
 * Generates a complete IRedditCommunityPostFile.ICreate with randomized file
 * metadata including original filename, MIME type, file size, and storage URL.
 * This data simulates a file attachment that would be uploaded alongside a
 * community post in the Reddit application.
 */
export function prepare_random_reddit_community_post_file(
  input?: DeepPartial<IRedditCommunityPostFile.ICreate>,
): IRedditCommunityPostFile.ICreate {
  return {
    file_name: input?.file_name ?? RandomGenerator.alphabets(8) + ".png",
    file_type:
      input?.file_type ??
      RandomGenerator.pick(["image/png", "image/jpeg", "image/gif"] as const),
    file_size:
      input?.file_size ??
      typia.random<
        number &
          tags.Type<"int32"> &
          tags.Minimum<1000> &
          tags.Maximum<10000000>
      >(),
    file_url:
      input?.file_url ??
      RandomGenerator.alphaNumeric(20) +
        "/" +
        RandomGenerator.alphaNumeric(20) +
        ".png",
  };
}
