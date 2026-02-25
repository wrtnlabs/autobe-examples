import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_board_article } from "../prepare/prepare_random_economic_board_article";

export async function generate_random_economic_board_citizen_articles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicBoardArticle.ICreate> | undefined;
  },
): Promise<IEconomicBoardArticle> {
  const prepared: IEconomicBoardArticle.ICreate =
    prepare_random_economic_board_article(props.body);
  const result: IEconomicBoardArticle =
    await api.functional.economicBoard.citizen.articles.create(connection, {
      body: prepared,
    });
  return result;
}
