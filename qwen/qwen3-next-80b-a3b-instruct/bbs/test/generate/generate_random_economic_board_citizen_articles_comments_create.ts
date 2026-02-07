import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_board_comment } from "../prepare/prepare_random_economic_board_comment";

export async function generate_random_economic_board_citizen_articles_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicBoardComment.ICreate> | undefined;
    params: {
      articleId: string;
    };
  },
): Promise<IEconomicBoardComment> {
  const prepared: IEconomicBoardComment.ICreate =
    prepare_random_economic_board_comment(props.body);
  return await api.functional.economicBoard.citizen.articles.comments.create(
    connection,
    {
      body: prepared,
      articleId: props.params.articleId,
    },
  );
}
