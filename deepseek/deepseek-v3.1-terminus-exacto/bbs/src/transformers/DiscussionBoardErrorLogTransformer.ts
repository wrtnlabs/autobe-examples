import { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardErrorLogTransformer {
  export type Payload = Prisma.discussion_board_error_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        error_type: true,
        error_message: true,
        stack_trace: true,
        severity: true,
        request_path: true,
        request_method: true,
        user_agent: true,
        ip_address: true,
        environment: true,
        component: true,
        occurred_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_error_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardErrorLog> {
    return {
      id: input.id,
      error_type: input.error_type,
      error_message: input.error_message,
      stack_trace: input.stack_trace ?? null,
      severity: input.severity,
      request_path: input.request_path ?? null,
      request_method: input.request_method ?? null,
      user_agent: input.user_agent ?? null,
      ip_address: input.ip_address ?? null,
      environment: input.environment,
      component: input.component ?? null,
      occurred_at: input.occurred_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
