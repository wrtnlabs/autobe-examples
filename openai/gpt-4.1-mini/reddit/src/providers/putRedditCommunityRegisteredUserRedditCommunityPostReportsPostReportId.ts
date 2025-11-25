import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostReport";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function putRedditCommunityRegisteredUserRedditCommunityPostReportsPostReportId(props: {
  registeredUser: RegistereduserPayload;
  postReportId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostReport.IUpdate;
}): Promise<IRedditCommunityPostReport> {
  const existing =
    await MyGlobal.prisma.reddit_community_post_reports.findUnique({
      where: { id: props.postReportId },
    });

  if (!existing) {
    throw new HttpException("Report not found", 404);
  }

  if (existing.reddit_community_registereduser_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated_at = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_community_post_reports.update({
    where: { id: props.postReportId },
    data: {
      reason: props.body.reason,
      updated_at,
    },
  });

  return {
    id: updated.id,
    reddit_community_post_id: updated.reddit_community_post_id,
    reddit_community_registereduser_id:
      updated.reddit_community_registereduser_id,
    reddit_community_registereduser_session_id:
      updated.reddit_community_registereduser_session_id,
    reason: updated.reason,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
