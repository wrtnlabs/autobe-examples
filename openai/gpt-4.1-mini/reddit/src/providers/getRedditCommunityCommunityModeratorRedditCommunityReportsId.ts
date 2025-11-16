import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function getRedditCommunityCommunityModeratorRedditCommunityReportsId(props: {
  communityModerator: CommunitymoderatorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReport> {
  const report = await MyGlobal.prisma.reddit_community_reports.findUnique({
    where: { id: props.id },
  });

  if (report === null || report.deleted_at !== null) {
    throw new HttpException("Reddit community report not found", 404);
  }

  return {
    id: report.id,
    reddit_community_registered_user_id:
      report.reddit_community_registered_user_id,
    reddit_community_posts_id: report.reddit_community_posts_id ?? undefined,
    reddit_community_comments_id:
      report.reddit_community_comments_id ?? undefined,
    reason: report.reason,
    description: report.description ?? undefined,
    status: report.status,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at:
      report.deleted_at === null ? null : toISOStringSafe(report.deleted_at),
  };
}
