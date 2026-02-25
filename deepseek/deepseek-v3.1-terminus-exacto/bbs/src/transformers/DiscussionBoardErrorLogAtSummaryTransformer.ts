import { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardErrorLogAtSummaryTransformer {
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
  ): Promise<IDiscussionBoardErrorLog.ISummary> {
    return {
      id: input.id,
      error_type: input.error_type,
      severity: input.severity,
      environment: input.environment,
      component: input.component ?? undefined,
      occurred_at: input.occurred_at.toISOString(),
    };
  }
}
