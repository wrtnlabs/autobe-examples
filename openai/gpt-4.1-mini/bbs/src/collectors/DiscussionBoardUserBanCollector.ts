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
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      banned_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      registeredUser: {
        connect: { id: props.body.registeredUserId },
      },
      administrator: undefined,
    } satisfies Prisma.discussion_board_user_bansCreateInput;
  }
}
