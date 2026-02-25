import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article_file(
  input?: DeepPartial<IDiscussionBoardArticleFile.ICreate> | undefined,
): IDiscussionBoardArticleFile.ICreate {
  return {
    fileName:
      input?.fileName ??
      RandomGenerator.paragraph({ sentences: 1 }) +
        "." +
        RandomGenerator.alphabets(3),
    fileType:
      input?.fileType ??
      RandomGenerator.pick([
        "application/pdf",
        "image/png",
        "image/jpeg",
        "text/plain",
        "application/zip",
      ] as const),
    fileSize:
      input?.fileSize ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5000000>
      >(),
    downloadUrl:
      input?.downloadUrl ?? typia.random<string & tags.Format<"uri">>(),
    displayOrder:
      input?.displayOrder ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
      >(),
  };
}
