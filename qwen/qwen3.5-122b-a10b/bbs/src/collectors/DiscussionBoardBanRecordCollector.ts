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
    discussionBoardAdmins: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      banned_at: new Date(),
      unbanned_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      discussionBoardMember: {
        connect: { id: props.body.discussionBoardMemberId },
      },
      discussionBoardAdmin: { connect: { id: props.discussionBoardAdmins.id } },
    } satisfies Prisma.discussion_board_ban_recordsCreateInput;
  }
}
