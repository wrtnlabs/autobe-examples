import { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardUserUnbanCollector {
  export async function collect(props: {
    body: IDiscussionBoardUserUnban.ICreate;
    userBan: IEntity;
    administrator: IEntity;
  }) {
    const id = v4();
    return {
      id,
      reason: "",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      userBan: { connect: { id: props.userBan.id } },
      administrator: { connect: { id: props.administrator.id } },
    } satisfies Prisma.discussion_board_user_unbansCreateInput;
  }
}
