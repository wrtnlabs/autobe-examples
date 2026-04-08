import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random reddit community post creation data for E2E testing.
 *
 * Generates a complete IRedditCommunityPost.ICreate with randomized values
 * for testing post creation functionality. The post type determines which
 * additional fields are populated (text_content for "text", link_url for "link",
 * files for "image").
 */
export function prepare_random_reddit_community_post(
  input?: DeepPartial<IRedditCommunityPost.ICreate>,
): IRedditCommunityPost.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    post_type:
      input?.post_type ??
      RandomGenerator.pick(["text", "link", "image"] as const),
    reddit_community_community_id:
      input?.reddit_community_community_id ??
      typia.random<string & tags.Format<"uuid">>(),
    text_content:
      input?.text_content ?? RandomGenerator.content({ paragraphs: 2 }),
    link_url: input?.link_url ?? RandomGenerator.alphaNumeric(100),
    files: input?.files
      ? input.files.map((file) => ({
          file_name: file.file_name ?? RandomGenerator.alphabets(12),
          file_type:
            file.file_type ??
            RandomGenerator.pick([
              "image/png",
              "image/jpeg",
              "image/gif",
            ] as const),
          file_size:
            file.file_size ?? typia.random<number & tags.Type<"int32">>(),
          file_url: file.file_url ?? RandomGenerator.alphaNumeric(200),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            file_name: RandomGenerator.alphabets(12),
            file_type: RandomGenerator.pick([
              "image/png",
              "image/jpeg",
              "image/gif",
            ] as const),
            file_size: typia.random<number & tags.Type<"int32">>(),
            file_url: RandomGenerator.alphaNumeric(200),
          }),
        ),
  };
}
