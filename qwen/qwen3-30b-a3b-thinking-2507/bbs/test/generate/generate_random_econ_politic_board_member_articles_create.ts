import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_econ_politic_board_article } from "../prepare/prepare_random_econ_politic_board_article";

export async function generate_random_econ_politic_board_member_articles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconPoliticBoardArticle.ICreate> | undefined;
  },
): Promise<IEconPoliticBoardArticle> {
  const prepared: IEconPoliticBoardArticle.ICreate =
    prepare_random_econ_politic_board_article(props.body);
  const result: IEconPoliticBoardArticle =
    await api.functional.econPoliticBoard.member.articles.create(connection, {
      body: prepared,
    });
  return result;
}
