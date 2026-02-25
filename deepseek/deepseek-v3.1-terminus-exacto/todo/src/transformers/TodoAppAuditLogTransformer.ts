import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";

export namespace TodoAppAuditLogTransformer {
  export type Payload = Prisma.todo_app_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        event_type: true,
        event_subtype: true,
        severity: true,
        description: true,
        ip_address: true,
        user_agent: true,
        resource_id: true,
        resource_type: true,
        metadata: true,
        created_at: true,
        updated_at: true,
        user: TodoAppUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_audit_logsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppAuditLog> {
    return {
      id: input.id,
      event_type: input.event_type,
      event_subtype: input.event_subtype ?? null,
      severity: input.severity,
      description: input.description,
      ip_address: input.ip_address ?? null,
      user_agent: input.user_agent ?? null,
      resource_id: input.resource_id ?? null,
      resource_type: input.resource_type ?? null,
      metadata: input.metadata ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      user: input.user
        ? await TodoAppUserAtSummaryTransformer.transform(input.user)
        : null,
    };
  }
}
