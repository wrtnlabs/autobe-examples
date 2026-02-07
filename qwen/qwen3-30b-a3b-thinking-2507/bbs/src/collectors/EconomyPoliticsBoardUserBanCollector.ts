import { IEconomyPoliticsBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomyPoliticsBoardUserBanCollector {
  export async function collect(props: {
    body: IEconomyPoliticsBoardUserBan.ICreate;
    economyPoliticsBoardUsers: IEntity;
    economyPoliticsBoardAdmins: IEntity;
  }) {
    const id = v4();
    return {
      id,
      reason: props.body.reason,
      start_at: new Date(),
      expire_at: props.body.expire_at,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      bannedUser: { connect: { id: props.economyPoliticsBoardUsers.id } },
      admin: { connect: { id: props.economyPoliticsBoardAdmins.id } },
    } satisfies Prisma.economy_politics_board_user_bansCreateInput;
  }
}
