import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { IRedditLikeOwnerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwnerAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeOwnerAtSummaryTransformer } from "./RedditLikeOwnerAtSummaryTransformer";

export namespace RedditLikeOwnerAuditLogTransformer {
  export type Payload = Prisma.reddit_like_owner_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeOwnerAuditLog> {
    return {
      id: input.id,
      action: input.action,
      entityType: input.entity_type ?? null,
      entityId: input.entity_id ?? null,
      details: input.details ?? null,
      ipAddress: input.ip_address ?? null,
      userAgent: input.user_agent ?? null,
      createdAt: input.created_at.toISOString(),
      owner: await RedditLikeOwnerAtSummaryTransformer.transform(input.owner),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        entity_type: true,
        entity_id: true,
        details: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        owner: RedditLikeOwnerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_owner_audit_logsFindManyArgs;
  }
}
