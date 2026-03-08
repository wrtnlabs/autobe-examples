import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_economic_political_board_ban_record } from "../prepare/prepare_random_economic_political_board_ban_record";

export async function generate_random_economic_political_board_admin_ban_records_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicPoliticalBoardBanRecord.ICreate>;
  },
): Promise<IEconomicPoliticalBoardBanRecord> {
  const prepared: IEconomicPoliticalBoardBanRecord.ICreate =
    prepare_random_economic_political_board_ban_record(props.body);
  const result: IEconomicPoliticalBoardBanRecord =
    await api.functional.economicPoliticalBoard.admin.ban_records.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
