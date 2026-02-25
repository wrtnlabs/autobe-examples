import { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformAuditLogAtSummaryTransformer {
  export type Payload = Prisma.community_platform_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        actor_id: true,
        action_type: true,
        action_details: true,
        ip_address: true,
        user_agent: true,
        success: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        community: true,
        post: true,
        comment: true,
        userAuditLog: true,
        moderatorAuditLog: true,
        auditLog: true,
      },
    } satisfies Prisma.community_platform_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformAuditLog.ISummary> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      action_type: input.action_type,
      success: input.success,
      ip_address: input.ip_address,
      created_at: input.created_at.toISOString(),
    };
  }
}
