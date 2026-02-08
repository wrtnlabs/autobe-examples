import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardUserBanCollector {
  export async function collect(props: {
    body: IDiscussionBoardUserBan.ICreate & {
      reason: string;
      bannedAt: string;
    };
    registeredUser: IEntity;
    administrator?: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      banned_at: new Date(props.body.bannedAt),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      registeredUser: { connect: { id: props.registeredUser.id } },
      administrator: props.administrator
        ? { connect: { id: props.administrator.id } }
        : undefined,
    } satisfies Prisma.discussion_board_user_bansCreateInput;
  }
}
