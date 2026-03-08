import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformAdminAuditLogAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        action_status: true,
        target_entity_type: true,
        target_entity_id: true,
        action_details: true,
        ip_address: true,
        user_agent: true,
        referrer: true,
        created_at: true,
        admin: true,
        session: true,
      },
    } satisfies Prisma.reddit_platform_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformAdminAuditLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      action_status: input.action_status,
      audit_log_type: "ADMIN" as const,
      created_at: input.created_at.toISOString(),
      actor_id: input.admin.id,
      ip_address: input.ip_address ?? null,
      referrer: input.referrer ?? null,
      session_id: input.session?.id ?? null,
      target_entity_id: input.target_entity_id ?? null,
      target_entity_type: input.target_entity_type ?? null,
      user_agent: input.user_agent ?? null,
    };
  }
}
