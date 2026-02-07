import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdministratorRequest";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economy_politics_board_administrator_request } from "../prepare/prepare_random_economy_politics_board_administrator_request";

export async function generate_random_economy_politics_board_user_administrator_requests_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IEconomyPoliticsBoardAdministratorRequest.ICreate>
      | undefined;
  },
): Promise<IEconomyPoliticsBoardAdministratorRequest> {
  const prepared: IEconomyPoliticsBoardAdministratorRequest.ICreate =
    prepare_random_economy_politics_board_administrator_request(props.body);
  return await api.functional.economyPoliticsBoard.user.administrator_requests.create(
    connection,
    {
      body: prepared,
    },
  );
}
