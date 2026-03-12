import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { IRedditCloneAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneAdminAtSummaryTransformer } from "./RedditCloneAdminAtSummaryTransformer";

export namespace RedditCloneAdminAuditLogAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_type: true,
        target_id: true,
        ip_address: true,
        created_at: true,
        admin: RedditCloneAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneAdminAuditLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      target_type: input.target_type,
      target_id: input.target_id,
      ip_address: input.ip_address,
      created_at: input.created_at.toISOString(),
      admin: await RedditCloneAdminAtSummaryTransformer.transform(input.admin),
    };
  }
}
