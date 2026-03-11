import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { IMultiUserTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAuditLog";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoAdminAtSummaryTransformer } from "./MultiUserTodoAdminAtSummaryTransformer";
import { MultiUserTodoMemberAtSummaryTransformer } from "./MultiUserTodoMemberAtSummaryTransformer";

export namespace MultiUserTodoAuditLogTransformer {
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
        member: MultiUserTodoMemberAtSummaryTransformer.select(),
        admin: MultiUserTodoAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoAuditLog> {
    return {
      id: input.id,
      actorType: input.actor_type,
      eventType: input.event_type,
      ipAddress: input.ip_address ?? null,
      userAgent: input.user_agent ?? null,
      successFlag: input.success_flag,
      details: input.details ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      member: input.member
        ? await MultiUserTodoMemberAtSummaryTransformer.transform(input.member)
        : null,
      admin: input.admin
        ? await MultiUserTodoAdminAtSummaryTransformer.transform(input.admin)
        : null,
    };
  }
}
