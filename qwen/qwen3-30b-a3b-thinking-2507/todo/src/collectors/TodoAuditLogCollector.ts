import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAuditLogCollector {
  export async function collect(props: {
    body: ITodoAuditLog.ICreate;
    todoUsers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      event_type: props.body.event_type,
      event_description: props.body.event_description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.todoUsers.id } },
    } satisfies Prisma.todo_audit_logsCreateInput;
  }
}
