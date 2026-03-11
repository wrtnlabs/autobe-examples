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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformModerationAuditLogTransformer } from "../transformers/RedditPlatformModerationAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberCommunitiesCommunityIdModerationAuditLogsLogId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  logId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformModerationAuditLog> {
  // Check if member is a moderator for the community
  const moderatorRecord =
    await MyGlobal.prisma.reddit_platform_community_moderators.findUnique({
      where: {
        community_id_user_id: {
          community_id: props.communityId,
          user_id: props.member.id,
        },
      },
    });
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Query audit log with all required relations
  const auditLog =
    await MyGlobal.prisma.reddit_platform_moderation_audit_logs.findUniqueOrThrow(
      {
        where: {
          id: props.logId,
          community_id: props.communityId,
          deleted_at: null,
        },
        ...RedditPlatformModerationAuditLogTransformer.select(),
      },
    );
  return await RedditPlatformModerationAuditLogTransformer.transform(auditLog);
}
