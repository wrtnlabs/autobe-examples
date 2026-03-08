import { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicPoliticalBoardBanRecordCollector {
  export async function collect(props: {
    body: IEconomicPoliticalBoardBanRecord.ICreate;
    economicPoliticalBoardAdministratorRoles: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      created_at: new Date(),
      user: { connect: { id: props.body.user_id } },
      bannedByAdmin: {
        connect: { id: props.economicPoliticalBoardAdministratorRoles.id },
      },
    } satisfies Prisma.economic_political_board_ban_recordsCreateInput;
  }
}
