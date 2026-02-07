import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardSearchFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchFilter";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economy_politics_board_search_filter } from "../prepare/prepare_random_economy_politics_board_search_filter";

export async function generate_random_economy_politics_board_user_filters_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomyPoliticsBoardSearchFilter.ICreate> | undefined;
  },
): Promise<IEconomyPoliticsBoardSearchFilter> {
  const prepared: IEconomyPoliticsBoardSearchFilter.ICreate =
    prepare_random_economy_politics_board_search_filter(props.body);
  return await api.functional.economyPoliticsBoard.user.filters.create(
    connection,
    {
      body: prepared,
    },
  );
}
