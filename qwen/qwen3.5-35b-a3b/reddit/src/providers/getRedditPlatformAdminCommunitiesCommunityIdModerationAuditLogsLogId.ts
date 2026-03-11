import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformModerationAuditLogTransformer } from "../transformers/RedditPlatformModerationAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminCommunitiesCommunityIdModerationAuditLogsLogId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  logId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformModerationAuditLog> {
  // Verify admin has moderator privileges for this community
  await MyGlobal.prisma.reddit_platform_community_moderators.findFirstOrThrow({
    where: {
      community_id: props.communityId,
      user_id: props.admin.id,
    },
  });
  const log =
    await MyGlobal.prisma.reddit_platform_moderation_audit_logs.findUniqueOrThrow(
      {
        where: {
          id: props.logId,
          community_id: props.communityId,
        },
        ...RedditPlatformModerationAuditLogTransformer.select(),
      },
    );
  return await RedditPlatformModerationAuditLogTransformer.transform(log);
}
