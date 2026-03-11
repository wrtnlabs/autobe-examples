import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import { IRedditPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformAdminAtSummaryTransformer } from "./RedditPlatformAdminAtSummaryTransformer";
import { RedditPlatformAdminSessionAtSummaryTransformer } from "./RedditPlatformAdminSessionAtSummaryTransformer";

export namespace RedditPlatformAdminAuditLogTransformer {
  export type Payload = Prisma.reddit_platform_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        admin: RedditPlatformAdminAtSummaryTransformer.select(),
        session: RedditPlatformAdminSessionAtSummaryTransformer.select(),
        action_type: true,
        action_status: true,
        target_entity_type: true,
        target_entity_id: true,
        action_details: true,
        ip_address: true,
        user_agent: true,
        referrer: true,
        created_at: true,
      },
    } satisfies Prisma.reddit_platform_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformAdminAuditLog> {
    return {
      id: input.id,
      admin: await RedditPlatformAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      session: input.session
        ? await RedditPlatformAdminSessionAtSummaryTransformer.transform(
            input.session,
          )
        : undefined,
      actionType: input.action_type,
      actionStatus: input.action_status,
      targetEntityType: input.target_entity_type ?? undefined,
      targetEntityId: input.target_entity_id ?? undefined,
      actionDetails: input.action_details ?? undefined,
      ipAddress: input.ip_address ?? undefined,
      userAgent: input.user_agent ?? undefined,
      referrer: input.referrer ?? undefined,
      createdAt: input.created_at.toISOString(),
    };
  }
}
