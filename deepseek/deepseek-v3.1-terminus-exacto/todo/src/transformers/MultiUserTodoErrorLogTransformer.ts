import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { IMultiUserTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminSession";
import { IMultiUserTodoErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoErrorLog";
import { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoAdminSessionAtSummaryTransformer } from "./MultiUserTodoAdminSessionAtSummaryTransformer";
import { MultiUserTodoMemberSessionAtSummaryTransformer } from "./MultiUserTodoMemberSessionAtSummaryTransformer";

export namespace MultiUserTodoErrorLogTransformer {
  export type Payload = Prisma.multi_user_todo_error_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        error_type: true,
        error_message: true,
        error_code: true,
        stack_trace: true,
        severity: true,
        http_status_code: true,
        request_path: true,
        request_method: true,
        user_agent: true,
        ip_address: true,
        environment: true,
        service_name: true,
        occurred_at: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        memberSession: MultiUserTodoMemberSessionAtSummaryTransformer.select(),
        adminSession: MultiUserTodoAdminSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_error_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoErrorLog> {
    return {
      id: input.id,
      error_type: input.error_type,
      error_message: input.error_message,
      error_code: input.error_code ?? undefined,
      stack_trace: input.stack_trace ?? undefined,
      severity: input.severity,
      http_status_code: input.http_status_code ?? undefined,
      request_path: input.request_path ?? undefined,
      request_method: input.request_method ?? undefined,
      user_agent: input.user_agent ?? undefined,
      ip_address: input.ip_address ?? undefined,
      environment: input.environment,
      service_name: input.service_name,
      occurred_at: input.occurred_at.toISOString(),
      resolved_at: input.resolved_at?.toISOString() ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      memberSession: input.memberSession
        ? await MultiUserTodoMemberSessionAtSummaryTransformer.transform(
            input.memberSession,
          )
        : undefined,
      adminSession: input.adminSession
        ? await MultiUserTodoAdminSessionAtSummaryTransformer.transform(
            input.adminSession,
          )
        : undefined,
    };
  }
}
