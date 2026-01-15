import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardBanCollector {
  export async function collect(props: {
    body: IDiscussionBoardBan.ICreate;
    discussionBoardModerators: IEntity;
    discussionBoardModeratorSessions: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      status: "active",
      justification: props.body.reason,
      moderator: {
        connect: { id: props.discussionBoardModerators.id },
      },
      citizen: {
        connect: { id: props.discussionBoardModeratorSessions.id },
      },
    } satisfies Prisma.discussion_board_bansCreateInput;
  }
}
