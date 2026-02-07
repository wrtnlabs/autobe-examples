import { ICommunityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityAuditLogAtSummaryTransformer {
  export type Payload = Prisma.community_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        action_type: true,
        description: true,
        created_at: true,
        updated_at: true,
        moderator: { select: { id: true } },
        target: { select: { id: true } },
      },
    } satisfies Prisma.community_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityAuditLog.ISummary> {
    return {
      id: input.id,
      moderator_id: input.moderator.id,
      target_id: input.target.id,
      target_type: typia.assert<"post" | "comment" | "report">(
        input.target_type,
      ),
      action_type: typia.assert<
        "delete_post" | "ban_user" | "approve_report" | "dismiss_report"
      >(input.action_type),
      description: input.description ?? undefined,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
