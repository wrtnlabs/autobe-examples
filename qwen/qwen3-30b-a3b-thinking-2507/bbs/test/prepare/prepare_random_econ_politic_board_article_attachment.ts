import { IEconPoliticBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_econ_politic_board_article_attachment(
  input?: DeepPartial<IEconPoliticBoardArticleAttachment.ICreate> | undefined,
): IEconPoliticBoardArticleAttachment.ICreate {
  return {};
}
