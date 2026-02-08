import { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article_search_index(
  input?: DeepPartial<IDiscussionBoardArticleSearchIndex.ICreate> | undefined,
): IDiscussionBoardArticleSearchIndex.ICreate {
  input;
  return {};
}
