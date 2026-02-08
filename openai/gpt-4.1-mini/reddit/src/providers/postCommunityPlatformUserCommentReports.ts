import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentReportCollector } from "../collectors/CommunityPlatformCommentReportCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserCommentReports(props: {
  user: UserPayload;
  body: ICommunityPlatformCommentReport.ICreate;
}): Promise<ICommunityPlatformCommentReport> {
  // Access comment id safely with fallback to empty string to avoid TS error
  const commentId = (props.body as any).comment_id;
  if (typeof commentId !== "string" || commentId.length === 0) {
    throw new HttpException(
      "Invalid or missing comment_id in request body",
      400,
    );
  }
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: commentId },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  const reporterUser =
    await MyGlobal.prisma.community_platform_users.findUnique({
      where: { id: props.user.id },
    });
  if (!reporterUser) {
    throw new HttpException("User not found", 404);
  }
  const created =
    await MyGlobal.prisma.community_platform_comment_reports.create({
      data: await CommunityPlatformCommentReportCollector.collect({
        body: props.body,
        comment: comment,
        reporterUser: reporterUser,
      }),
    });
  const report =
    await MyGlobal.prisma.community_platform_comment_reports.findUnique({
      where: { id: created.id },
    });
  if (!report) {
    throw new HttpException("Created report not found", 404);
  }
  return {
    id: created.id,
    comment_id: created.comment_id,
    reporter_user_id: created.reporter_user_id,
    report_reason_id:
      created.report_reason_id === null ? undefined : created.report_reason_id,
    status: created.status,
    description: created.description === null ? undefined : created.description,
    created_at: toISOStringSafe(created.created_at)!,
    updated_at: toISOStringSafe(created.updated_at)!,
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
