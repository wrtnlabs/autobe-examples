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
    discussionBoardAdmins: IEntity;
    discussionBoardAdminSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      reason: props.body.reason,
      banned_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      member: { connect: { id: props.body.member_id } },
      admin: { connect: { id: props.discussionBoardAdmins.id } },
      // HasMany relations (not needed - reverse relation)
      histories: undefined,
    } satisfies Prisma.discussion_board_bansCreateInput;
  }
}
