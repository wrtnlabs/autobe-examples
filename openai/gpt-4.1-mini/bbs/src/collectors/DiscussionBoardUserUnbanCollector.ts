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
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      userBan: { connect: { id: props.body.userBanId } },
      administrator: { connect: { id: props.body.administratorId } },
    } satisfies Prisma.discussion_board_user_unbansCreateInput;
  }
}
