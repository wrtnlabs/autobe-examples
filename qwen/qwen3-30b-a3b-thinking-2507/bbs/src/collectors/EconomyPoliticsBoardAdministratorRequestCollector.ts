import { IEconomyPoliticsBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomyPoliticsBoardAdministratorRequestCollector {
  export async function collect(props: {
    body: IEconomyPoliticsBoardAdministratorRequest.ICreate;
    economyPoliticsBoardUsers: IEntity;
  }) {
    const id = v4();
    return {
      id,
      status: "pending",
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      requestor: { connect: { id: props.economyPoliticsBoardUsers.id } },
    } satisfies Prisma.economy_politics_board_administrator_requestsCreateInput;
  }
}
