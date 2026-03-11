import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardUserBanCollector {
  export async function collect(props: {
    body: IDiscussionBoardUserBan.ICreate;
    discussionBoardAdmins: IEntity;
    discussionBoardAdminSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      reason: props.body.reason,
      status: "active",
      banned_at: new Date(),
      expires_at: props.body.expires_at ?? null,
      unbanned_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      member: { connect: { id: props.body.member_id } },
      admin: { connect: { id: props.discussionBoardAdmins.id } },
      // HasMany relation (not applicable for creation)
      administrativeHistories: undefined,
    } satisfies Prisma.discussion_board_user_bansCreateInput;
  }
}
