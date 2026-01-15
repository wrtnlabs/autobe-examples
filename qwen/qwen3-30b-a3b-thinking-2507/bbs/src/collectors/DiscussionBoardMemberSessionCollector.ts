import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardMemberSessionCollector {
  export async function collect(props: {
    body: IDiscussionBoardMemberSession.ICreate;
    discussionBoardMembers: IEntity;
    ip: string;
    href: string;
    referrer: string;
  }) {
    return {
      id: v4(),
      ip: props.body.ip ?? props.ip,
      href: props.href,
      referrer: props.referrer,
      created_at: new Date(),
      expired_at: props.body.expires_at,
      member: {
        connect: { id: props.discussionBoardMembers.id },
      },
    } satisfies Prisma.discussion_board_member_sessionsCreateInput;
  }
}
