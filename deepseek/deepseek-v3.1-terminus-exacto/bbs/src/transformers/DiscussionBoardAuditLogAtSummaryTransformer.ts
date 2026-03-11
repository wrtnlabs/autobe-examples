import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAuditLogAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        actor_id: true,
        target_type: true,
        target_id: true,
        action_type: true,
        action_details: true,
        ip_address: true,
        user_agent: true,
        href: true,
        created_at: true,
        updated_at: true,
        administrativeHistory: true,
      },
    } satisfies Prisma.discussion_board_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAuditLog.ISummary> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      target_type: input.target_type,
      action_type: input.action_type,
      created_at: input.created_at.toISOString(),
    };
  }
}
