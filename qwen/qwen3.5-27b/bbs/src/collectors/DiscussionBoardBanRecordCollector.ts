import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardBanRecordCollector {
  export async function collect(props: {
    body: IDiscussionBoardBanRecord.ICreate;
    discussionBoardAdministrators: IEntity;
  }) {
    return {
      id: v4(),
      actor_type: props.body.actor_type,
      ban_reason: props.body.ban_reason,
      banned_at: new Date(),
      unbanned_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      bannedBy: { connect: { id: props.discussionBoardAdministrators.id } },
    } satisfies Prisma.discussion_board_ban_recordsCreateInput;
  }
}
