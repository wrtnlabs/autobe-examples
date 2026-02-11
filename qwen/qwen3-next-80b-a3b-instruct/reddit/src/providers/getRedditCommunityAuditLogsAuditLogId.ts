import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { IRedditCommunityUserAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityUserAuditLogTransformer } from "../transformers/RedditCommunityUserAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityAuditLogsAuditLogId(props: {
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityUserAuditLog> {
  const auditLog =
    await MyGlobal.prisma.reddit_community_user_audit_logs.findUnique({
      where: { id: props.auditLogId },
      ...RedditCommunityUserAuditLogTransformer.select(),
    });
  if (!auditLog) throw new HttpException("Audit log not found", 404);
  return await RedditCommunityUserAuditLogTransformer.transform(auditLog);
}
