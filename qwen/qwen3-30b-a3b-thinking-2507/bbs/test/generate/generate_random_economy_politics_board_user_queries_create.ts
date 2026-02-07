import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchQuery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economy_politics_board_search_query } from "../prepare/prepare_random_economy_politics_board_search_query";

export async function generate_random_economy_politics_board_user_queries_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomyPoliticsBoardSearchQuery.ICreate> | undefined;
  },
): Promise<IEconomyPoliticsBoardSearchQuery> {
  const prepared: IEconomyPoliticsBoardSearchQuery.ICreate =
    prepare_random_economy_politics_board_search_query(props.body);
  return await api.functional.economyPoliticsBoard.user.queries.create(
    connection,
    {
      body: prepared,
    },
  );
}
