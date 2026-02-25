import { IEconomicPoliticalDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicPoliticalDiscussionBoardBanCollector {
  export async function collect(props: {
    body: IEconomicPoliticalDiscussionBoardBan.ICreate;
    economicPoliticalDiscussionBoardUsers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      bannedUser: { connect: { id: props.body.user_id } },
      appliedBy: {
        connect: { id: props.economicPoliticalDiscussionBoardUsers.id },
      },
    } satisfies Prisma.economic_political_discussion_board_bansCreateInput;
  }
}
