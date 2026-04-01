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

export namespace RedditLikeOwnerAuditLogAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_owner_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        entity_type: true,
        entity_id: true,
        created_at: true,
        owner: RedditLikeOwnerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_owner_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeOwnerAuditLog.ISummary> {
    return {
      id: input.id,
      action: input.action,
      entity_type: input.entity_type ?? null,
      entity_id: input.entity_id ?? null,
      owner: await RedditLikeOwnerAtSummaryTransformer.transform(input.owner),
      created_at: input.created_at.toISOString(),
    };
  }
}
