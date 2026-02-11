import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityUserAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLogDetail";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityUserAuditLogDetailTransformer {
  export type Payload =
    Prisma.reddit_community_user_audit_log_detailsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        auditLog: true,
      },
    } satisfies Prisma.reddit_community_user_audit_log_detailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityUserAuditLogDetail> {
    return {
      key: input.key,
      value: input.value,
    };
  }
}
