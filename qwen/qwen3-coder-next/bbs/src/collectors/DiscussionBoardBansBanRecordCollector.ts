import { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardBansBanRecordCollector {
  export async function collect(props: { user: IEntity; admin: IEntity }) {
    return {
      id: v4(),
      reason: "",
      start_time: new Date(),
      end_time: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.user.id } },
      admin: { connect: { id: props.admin.id } },
    } satisfies Prisma.discussion_board_bans_ban_recordsCreateInput;
  }
}
