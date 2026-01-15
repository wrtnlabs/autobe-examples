import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardAuthenticationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthenticationLog";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAuthenticationLogCollector {
  export async function collect(props: {
    body: IDiscussionBoardAuthenticationLog.ICreate;
  }) {
    return {
      id: v4(),
      actor_type: props.body.authentication_type,
      ip: props.body.ip_address,
      user_agent: props.body.user_agent,
      referrer: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      expired_at: null,
      citizen: undefined,
      moderator: undefined,
    } satisfies Prisma.discussion_board_authentication_logsCreateInput;
  }
}
