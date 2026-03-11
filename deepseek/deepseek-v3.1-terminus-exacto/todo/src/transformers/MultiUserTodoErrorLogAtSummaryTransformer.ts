import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoErrorLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoErrorLogAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_error_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        error_type: true,
        error_message: true,
        severity: true,
        service_name: true,
        environment: true,
        occurred_at: true,
        resolved_at: true,
      },
    } satisfies Prisma.multi_user_todo_error_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoErrorLog.ISummary> {
    return {
      id: input.id,
      error_type: input.error_type,
      error_message: input.error_message.slice(0, 200),
      severity: input.severity,
      service_name: input.service_name,
      environment: input.environment,
      occurred_at: input.occurred_at.toISOString(),
      resolved_at: input.resolved_at?.toISOString() ?? null,
    };
  }
}
