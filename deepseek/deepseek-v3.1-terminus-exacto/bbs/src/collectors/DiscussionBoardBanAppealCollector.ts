import { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardBanAppealCollector {
  export async function collect(props: {
    body: IDiscussionBoardBanAppeal.ICreate;
    discussionBoardBanRecords: IEntity;
    discussionBoardUsers: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      appeal_reason: props.body.appeal_reason,
      status: "pending",
      decision_reason: null,
      appealed_at: now,
      reviewed_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      banRecord: { connect: { id: props.discussionBoardBanRecords.id } },
      user: { connect: { id: props.discussionBoardUsers.id } },
      reviewer: undefined,
    } satisfies Prisma.discussion_board_ban_appealsCreateInput;
  }
}
