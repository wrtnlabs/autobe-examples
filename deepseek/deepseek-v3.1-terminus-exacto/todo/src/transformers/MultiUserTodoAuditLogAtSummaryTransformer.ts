import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoAuditLogAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        event_type: true,
        ip_address: true,
        user_agent: true,
        success_flag: true,
        details: true,
        created_at: true,
        updated_at: true,
        member: true,
        admin: true,
      },
    } satisfies Prisma.multi_user_todo_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoAuditLog.ISummary> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      event_type: input.event_type,
      ip_address: input.ip_address ?? undefined,
      user_agent: input.user_agent ?? undefined,
      success_flag: input.success_flag,
      created_at: input.created_at.toISOString(),
    };
  }
}
