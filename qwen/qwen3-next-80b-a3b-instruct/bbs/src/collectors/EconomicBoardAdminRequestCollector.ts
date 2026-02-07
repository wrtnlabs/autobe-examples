import { IEconomicBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdminRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicBoardAdminRequestCollector {
  export async function collect(props: {
    body: IEconomicBoardAdminRequest.ICreate;
    economicBoardCitizens: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      status: "pending",
      reason_text: props.body.reason_text,
      created_at: new Date(),
      processed_at: null,
      requester: { connect: { id: props.economicBoardCitizens.id } },
      processor: undefined,
    } satisfies Prisma.economic_board_admin_requestsCreateInput;
  }
}
