import { IEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicBoardBanCollector {
  export async function collect(props: {
    body: IEconomicBoardBan.ICreate;
    administrator: IEntity;
    citizen: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      ban_reason: "", // Required but DTO is empty - fallback empty string as last resort
      banned_at: new Date(),
      unbanned_at: null,
      citizen: { connect: { id: props.citizen.id } },
      administrator: { connect: { id: props.administrator.id } },
    } satisfies Prisma.economic_board_bansCreateInput;
  }
}
