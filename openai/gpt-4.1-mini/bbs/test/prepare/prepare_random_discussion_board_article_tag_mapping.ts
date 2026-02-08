import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_article_tag_mapping(
  input?: DeepPartial<IDiscussionBoardArticleTagMapping.ICreate> | undefined,
): IDiscussionBoardArticleTagMapping.ICreate {
  input;
  return {};
}
