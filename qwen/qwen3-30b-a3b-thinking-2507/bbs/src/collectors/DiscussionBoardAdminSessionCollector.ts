import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdminSessionCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdminSession.ICreate;
    discussionBoardAdmins: IEntity;
    ip: string;
  }) {
    return {
      id: v4(),
      ip: props.body.ip,
      href: "/",
      referrer: "/",
      created_at: new Date(),
      expired_at: null,
      admin: {
        connect: { id: props.discussionBoardAdmins.id },
      },
    } satisfies Prisma.discussion_board_admin_sessionsCreateInput;
  }
}
