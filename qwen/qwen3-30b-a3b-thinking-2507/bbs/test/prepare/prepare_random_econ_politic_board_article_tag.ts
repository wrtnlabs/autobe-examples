import { IEconPoliticBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_econ_politic_board_article_tag(
  input?: DeepPartial<IEconPoliticBoardArticleTag.ICreate> | undefined,
): IEconPoliticBoardArticleTag.ICreate {
  return {};
}
