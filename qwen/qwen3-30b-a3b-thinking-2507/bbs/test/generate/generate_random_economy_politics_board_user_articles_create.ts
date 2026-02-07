import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticle";
import type { IEconomyPoliticsBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleAttachment";
import type { IEconomyPoliticsBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardArticleTag";
import type { IEconomyPoliticsBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSection";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economy_politics_board_article } from "../prepare/prepare_random_economy_politics_board_article";

export async function generate_random_economy_politics_board_user_articles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomyPoliticsBoardArticle.ICreate> | undefined;
  },
): Promise<IEconomyPoliticsBoardArticle> {
  const prepared: IEconomyPoliticsBoardArticle.ICreate =
    prepare_random_economy_politics_board_article(props.body);
  return await api.functional.economyPoliticsBoard.user.articles.create(
    connection,
    {
      body: prepared,
    },
  );
}
