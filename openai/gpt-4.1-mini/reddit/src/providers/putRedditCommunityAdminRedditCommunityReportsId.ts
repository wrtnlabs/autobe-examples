import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminRedditCommunityReportsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.IUpdate;
}): Promise<IRedditCommunityReport> {
  const existing = await MyGlobal.prisma.reddit_community_reports.findUnique({
    where: { id: props.id },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Report not found", 404);
  }

  const currentTime = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: props.id },
    data: {
      ...props.body,
      updated_at: currentTime,
    },
  });

  return {
    id: updated.id,
    reddit_community_registered_user_id:
      updated.reddit_community_registered_user_id,
    reddit_community_posts_id:
      updated.reddit_community_posts_id === null
        ? null
        : updated.reddit_community_posts_id,
    reddit_community_comments_id:
      updated.reddit_community_comments_id === null
        ? null
        : updated.reddit_community_comments_id,
    reason: updated.reason,
    description: updated.description === null ? null : updated.description,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
