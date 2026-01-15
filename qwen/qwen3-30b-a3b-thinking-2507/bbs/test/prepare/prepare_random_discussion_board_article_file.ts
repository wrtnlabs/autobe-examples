import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
export function prepare_random_discussion_board_article_file(
  input?: DeepPartial<IDiscussionBoardArticleFile.ICreate> | undefined,
): IDiscussionBoardArticleFile.ICreate {
  return {
    mime_type:
      input?.mime_type ??
      RandomGenerator.pick([
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.ms-powerpoint",
        "image/jpeg",
        "image/png",
        "image/gif",
      ] as const),
    size:
      input?.size ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    name:
      input?.name ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      ),
    uri: input?.uri ?? typia.random<string & tags.Format<"uri">>(),
    extension:
      input?.extension ??
      "." +
        RandomGenerator.alphabets(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
          >(),
        ),
  };
}
