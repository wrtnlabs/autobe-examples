import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import type { IEconomyPoliticsBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economy_politics_board_user_ban } from "../prepare/prepare_random_economy_politics_board_user_ban";

export async function generate_random_economy_politics_board_admin_users_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomyPoliticsBoardUserBan.ICreate> | undefined;
    params: {
      userId: string;
    };
  },
): Promise<IEconomyPoliticsBoardUserBan> {
  const prepared: IEconomyPoliticsBoardUserBan.ICreate =
    prepare_random_economy_politics_board_user_ban(props.body);
  return await api.functional.economyPoliticsBoard.admin.users.bans.create(
    connection,
    {
      body: prepared,
      userId: props.params.userId,
    },
  );
}
