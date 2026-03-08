import { IDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdminAuditLogAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        reason: true,
        ip: true,
        created_at: true,
      },
    } satisfies Prisma.discussion_board_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdminAuditLog.ISummary> {
    return {
      id: input.id,
      action: input.action,
      reason: input.reason,
      ip: input.ip,
      created_at: input.created_at.toISOString(),
    };
  }
}
