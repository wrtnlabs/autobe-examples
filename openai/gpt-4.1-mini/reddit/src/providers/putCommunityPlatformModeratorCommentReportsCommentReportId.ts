import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorCommentReportsCommentReportId(props: {
  moderator: ModeratorPayload;
  commentReportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentReport.IUpdate;
}): Promise<ICommunityPlatformCommentReport> {
  const existing =
    await MyGlobal.prisma.community_platform_comment_reports.findUnique({
      where: { id: props.commentReportId },
    });
  if (!existing) throw new HttpException("Comment report not found", 404);
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.community_platform_comment_reports.update({
      where: { id: props.commentReportId },
      data: {
        status: (props.body as any).status,
        description:
          (props.body as any).description === undefined
            ? null
            : (props.body as any).description,
        report_reason_id:
          (props.body as any).report_reason_id === undefined
            ? null
            : (props.body as any).report_reason_id,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });
  return {
    id: updated.id,
    comment_id: updated.comment_id,
    reporter_user_id: updated.reporter_user_id,
    report_reason_id:
      updated.report_reason_id === null ? null : updated.report_reason_id,
    status: updated.status,
    description: updated.description === null ? null : updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
