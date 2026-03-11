import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_political_board_comment } from "../prepare/prepare_random_economic_political_board_comment";

export async function generate_random_economic_political_board_member_articles_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicPoliticalBoardComment.ICreate>;
    params?: {
      articleId: string;
    };
  },
): Promise<IEconomicPoliticalBoardComment> {
  const prepared: IEconomicPoliticalBoardComment.ICreate =
    prepare_random_economic_political_board_comment(props.body);
  const result: IEconomicPoliticalBoardComment =
    await api.functional.economicPoliticalBoard.member.articles.comments.create(
      connection,
      {
        articleId:
          props.params?.articleId ??
          typia.random<string & tags.Format<"uuid">>(),
        body: prepared,
      },
    );
  return result;
}
