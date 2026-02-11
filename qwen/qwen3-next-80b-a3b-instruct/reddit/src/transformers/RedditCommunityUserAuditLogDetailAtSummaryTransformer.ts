import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { IRedditCommunityUserAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLog";
import { IRedditCommunityUserAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLogDetail";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityUserAuditLogAtSummaryTransformer } from "./RedditCommunityUserAuditLogAtSummaryTransformer";

export namespace RedditCommunityUserAuditLogDetailAtSummaryTransformer {
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
        auditLog: RedditCommunityUserAuditLogAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_user_audit_log_detailsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityUserAuditLogDetail.ISummary> {
    return {
      key: input.key,
      value: input.value,
      auditLogId:
        await RedditCommunityUserAuditLogAtSummaryTransformer.transform(
          input.auditLog,
        ),
    };
  }
}
