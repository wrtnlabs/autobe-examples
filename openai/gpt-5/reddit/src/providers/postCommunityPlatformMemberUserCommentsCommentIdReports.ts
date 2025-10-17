import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEReportCategory";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function postCommunityPlatformMemberUserCommentsCommentIdReports(props: {
  memberUser: MemberuserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReport.ICreate;
}): Promise<ICommunityPlatformReport> {
  const { memberUser, commentId, body } = props;

  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: memberUser.id },
    select: { id: true, deleted_at: true },
  });
  if (!user || user.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }

  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: commentId },
    select: { id: true, deleted_at: true },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  const existing = await MyGlobal.prisma.community_platform_reports.findFirst({
    where: {
      community_platform_user_id: memberUser.id,
      community_platform_comment_id: commentId,
      category: body.category,
      reason: body.reason,
    },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("REPORT_DUPLICATE_OPEN", 409);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id = v4();

  await MyGlobal.prisma.community_platform_reports.create({
    data: {
      id,
      community_platform_user_id: memberUser.id,
      community_platform_post_id: null,
      community_platform_comment_id: commentId,
      category: body.category,
      reason: body.reason,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id,
    community_platform_user_id: memberUser.id,
    community_platform_post_id: null,
    community_platform_comment_id: commentId,
    category: body.category,
    reason: body.reason,
    created_at: now,
    updated_at: now,
  };
}
