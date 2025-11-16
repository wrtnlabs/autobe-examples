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

export async function putRedditCommunityCommunityModeratorRedditCommunityReportsId(props: {
  communityModerator: CommunitymoderatorPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.IUpdate;
}): Promise<IRedditCommunityReport> {
  const existingReport =
    await MyGlobal.prisma.reddit_community_reports.findUnique({
      where: { id: props.id },
    });

  if (!existingReport || existingReport.deleted_at !== null) {
    throw new HttpException("Report not found", 404);
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: props.id },
    data: {
      ...props.body,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    reddit_community_registered_user_id:
      updated.reddit_community_registered_user_id,
    reddit_community_posts_id: updated.reddit_community_posts_id ?? undefined,
    reddit_community_comments_id:
      updated.reddit_community_comments_id ?? undefined,
    reason: updated.reason,
    description: updated.description ?? null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
