import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article_file(
  input?: DeepPartial<IDiscussionBoardArticleFile.ICreate>,
): IDiscussionBoardArticleFile.ICreate {
  return {
    name: input?.name ?? typia.random<string & tags.Format<"uuid">>(),
    original_name: input?.original_name ?? `${RandomGenerator.name(1)}.txt`,
    mime_type:
      input?.mime_type ??
      RandomGenerator.pick([
        "text/plain",
        "application/pdf",
        "image/png",
        "image/jpeg",
        "application/msword",
      ] as const),
    size:
      input?.size ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10485760>
      >(),
    path: input?.path ?? typia.random<string & tags.Format<"url">>(),
  };
}
