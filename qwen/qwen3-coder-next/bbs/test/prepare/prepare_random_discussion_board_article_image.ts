import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article_image(
  input?: DeepPartial<IDiscussionBoardArticleImage.ICreate> | undefined,
): IDiscussionBoardArticleImage.ICreate {
  return {
    file_uri: input?.file_uri ?? typia.random<string & tags.Format<"uri">>(),
    original_filename:
      input?.original_filename ?? RandomGenerator.alphaNumeric(12),
    mime_type:
      input?.mime_type ??
      RandomGenerator.pick([
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ] as const),
    file_size:
      input?.file_size ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000000>
      >(),
  };
}
