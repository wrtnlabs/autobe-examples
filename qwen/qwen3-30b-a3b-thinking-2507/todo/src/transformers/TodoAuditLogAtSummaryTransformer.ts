import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAuditLog";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoUserAtSummaryTransformer } from "./TodoUserAtSummaryTransformer";

export namespace TodoAuditLogAtSummaryTransformer {
  export type Payload = Prisma.todo_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        event_type: true,
        event_description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: TodoUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAuditLog.ISummary> {
    return {
      id: input.id,
      event_type: input.event_type,
      event_description: input.event_description ?? null,
      created_at: input.created_at.toISOString(),
      user: await TodoUserAtSummaryTransformer.transform(input.user),
    };
  }
}
