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
        action_type: true,
        action_status: true,
        target_entity_type: true,
        target_entity_id: true,
        action_details: true,
        ip_address: true,
        user_agent: true,
        referrer: true,
        created_at: true,
        admin: RedditPlatformAdminAtSummaryTransformer.select(),
        session: RedditPlatformAdminSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformAdminAuditLog> {
    return {
      id: input.id,
      action_type: input.action_type,
      action_status: input.action_status,
      target_entity_type: input.target_entity_type ?? undefined,
      target_entity_id: input.target_entity_id ?? undefined,
      action_details: input.action_details ?? undefined,
      ip_address: input.ip_address ?? undefined,
      user_agent: input.user_agent ?? undefined,
      referrer: input.referrer ?? undefined,
      created_at: input.created_at.toISOString(),
      admin: await RedditPlatformAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      session: input.session
        ? await RedditPlatformAdminSessionAtSummaryTransformer.transform(
            input.session,
          )
        : null,
    };
  }
}
