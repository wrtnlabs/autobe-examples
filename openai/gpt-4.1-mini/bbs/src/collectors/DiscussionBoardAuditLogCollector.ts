import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAuditLogCollector {
  export async function collect(props: {
    body: IDiscussionBoardAuditLog.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      event_type: props.body.event_type,
      event_description: props.body.event_description,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      actor: props.body.actor_id
        ? { connect: { id: props.body.actor_id } }
        : undefined,
    } satisfies Prisma.discussion_board_audit_logsCreateInput;
  }
}
