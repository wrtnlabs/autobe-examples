import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_political_board_attachment } from "../prepare/prepare_random_economic_political_board_attachment";

export async function generate_random_economic_political_board_member_articles_attachments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicPoliticalBoardAttachment.ICreate>;
    params?: {
      articleId: string;
    };
  },
): Promise<IEconomicPoliticalBoardAttachment> {
  const prepared: IEconomicPoliticalBoardAttachment.ICreate =
    prepare_random_economic_political_board_attachment(props.body);
  const result: IEconomicPoliticalBoardAttachment =
    await api.functional.economicPoliticalBoard.member.articles.attachments.create(
      connection,
      {
        articleId: props.params?.articleId ?? "00000000-0000-0000-0000-000000000000",
        body: prepared,
      },
    );
  return result;
}