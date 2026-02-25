import { IEconomicPoliticalDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdminRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicPoliticalDiscussionBoardAdminRequestCollector {
  export async function collect(props: {
    body: IEconomicPoliticalDiscussionBoardAdminRequest.ICreate;
    economicPoliticalDiscussionBoardUsers: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: {
        connect: {
          id: props.economicPoliticalDiscussionBoardUsers.id,
        },
      },
    } satisfies Prisma.economic_political_discussion_board_admin_requestsCreateInput;
  }
}
