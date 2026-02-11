import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { IRedditCommunityUserAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityModeratorAtSummaryTransformer } from "./RedditCommunityCommunityModeratorAtSummaryTransformer";
import { RedditCommunityCommunityOwnerAtSummaryTransformer } from "./RedditCommunityCommunityOwnerAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPlatformAdminAtSummaryTransformer } from "./RedditCommunityPlatformAdminAtSummaryTransformer";

export namespace RedditCommunityUserAuditLogTransformer {
  export type Payload = Prisma.reddit_community_user_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        ip_address: true,
        user_agent: true,
        session_id: true,
        details: true,
        created_at: true,
        member: RedditCommunityMemberAtSummaryTransformer.select(),
        owner: RedditCommunityCommunityOwnerAtSummaryTransformer.select(),
        moderator:
          RedditCommunityCommunityModeratorAtSummaryTransformer.select(),
        admin: RedditCommunityPlatformAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_user_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityUserAuditLog> {
    return {
      id: input.id,
      action: typia.assert<
        "login" | "logout" | "password_change" | "account_deletion"
      >(input.action),
      ip_address: input.ip_address,
      user_agent: input.user_agent ?? undefined,
      session_id: input.session_id ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      member: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      owner: input.owner
        ? await RedditCommunityCommunityOwnerAtSummaryTransformer.transform(
            input.owner,
          )
        : null,
      moderator: input.moderator
        ? await RedditCommunityCommunityModeratorAtSummaryTransformer.transform(
            input.moderator,
          )
        : null,
      admin: input.admin
        ? await RedditCommunityPlatformAdminAtSummaryTransformer.transform(
            input.admin,
          )
        : null,
      details: input.details ?? undefined,
    };
  }
}
