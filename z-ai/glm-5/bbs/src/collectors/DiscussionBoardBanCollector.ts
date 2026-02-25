import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardBanCollector {
  export async function collect(props: {
    body: IDiscussionBoardBan.ICreate;
    discussionBoardUsers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      created_at: new Date(),
      // BelongsTo relations - use connect with relation property names
      user: { connect: { id: props.body.userId } },
      administrator: { connect: { id: props.discussionBoardUsers.id } },
    } satisfies Prisma.discussion_board_bansCreateInput;
  }
}
