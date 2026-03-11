import { IDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemAuditLogParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSystemAuditLogParameterCollector {
  export async function collect(props: {
    body: IDiscussionBoardSystemAuditLogParameter.ICreate;
    discussionBoardSystemAuditLogs: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      parameter_key: props.body.parameterKey,
      parameter_value: props.body.parameterValue,
      created_at: new Date(),
      updated_at: new Date(),
      systemAuditLog: {
        connect: { id: props.discussionBoardSystemAuditLogs.id },
      },
    } satisfies Prisma.discussion_board_system_audit_log_parametersCreateInput;
  }
}
