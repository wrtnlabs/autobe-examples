import { IDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardUnbanCollector {
  export async function collect(props: {
    body: IDiscussionBoardUnban.ICreate;
    discussionBoardUsers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      ban: { connect: { id: props.body.discussion_board_ban_id } },
      administrator: { connect: { id: props.discussionBoardUsers.id } },
    } satisfies Prisma.discussion_board_unbansCreateInput;
  }
}
