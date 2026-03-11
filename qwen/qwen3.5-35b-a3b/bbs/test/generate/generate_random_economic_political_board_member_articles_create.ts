import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_political_board_article } from "../prepare/prepare_random_economic_political_board_article";

export async function generate_random_economic_political_board_member_articles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicPoliticalBoardArticle.ICreate>;
  },
): Promise<IEconomicPoliticalBoardArticle> {
  const prepared: IEconomicPoliticalBoardArticle.ICreate =
    prepare_random_economic_political_board_article(props.body);
  const result: IEconomicPoliticalBoardArticle =
    await api.functional.economicPoliticalBoard.member.articles.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
