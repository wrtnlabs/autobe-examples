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
    originalFilename: input?.originalFilename ?? RandomGenerator.name(1),
    mimeType:
      input?.mimeType ??
      RandomGenerator.pick([
        "application/pdf",
        "text/plain",
        "image/jpeg",
        "image/png",
        "application/json",
        "text/html",
      ] as const),
  };
}
