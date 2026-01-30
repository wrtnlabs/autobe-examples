import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumSystemAudit";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicForumSystemAuditAtSummaryTransformer {
  export type Payload = Prisma.economic_forum_system_auditsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        target_type: true,
        target_id: true,
        action: true,
        reason: true,
        created_at: true,
        deleted_at: true,
        user: {
          select: {
            id: true,
          },
        },
        admin: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.economic_forum_system_auditsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicForumSystemAudit.ISummary> {
    // Compute action_type
    let actionType: string;
    if (input.user !== null) {
      actionType = "user_login";
    } else if (input.admin !== null) {
      actionType = "admin_login";
    } else {
      actionType = "system_update";
    }
    // Compute severity_level: all cases are 'info' due to schema limitations
    const severityLevel = "info";
    // Compute actor_id
    let actorId: string;
    if (input.user !== null) {
      actorId = input.user.id;
    } else if (input.admin !== null) {
      actorId = input.admin.id;
    } else {
      actorId = "system";
    }
    return {
      action_type: actionType,
      target_id: input.target_id,
      created_at: input.created_at.toISOString(),
      severity_level: severityLevel,
      actor_id: actorId,
    };
  }
}
