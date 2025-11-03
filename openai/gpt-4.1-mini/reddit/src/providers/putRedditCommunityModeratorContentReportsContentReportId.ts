import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putRedditCommunityModeratorContentReportsContentReportId(props: {
  moderator: ModeratorPayload;
  contentReportId: string & tags.Format<"uuid">;
  body: IRedditCommunityContentReport.IUpdate;
}): Promise<IRedditCommunityContentReport> {
  const { moderator, contentReportId, body } = props;

  await MyGlobal.prisma.reddit_community_content_reports.findUniqueOrThrow({
    where: { id: contentReportId },
  });

  const updated = await MyGlobal.prisma.reddit_community_content_reports.update(
    {
      where: { id: contentReportId },
      data: {
        report_reason_id: body.report_reason_id,
        report_status_id: body.report_status_id,
        additional_details: body.additional_details ?? null,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  return {
    id: updated.id,
    reporter_id: updated.reporter_id,
    content_id: updated.content_id,
    report_reason_id: updated.report_reason_id,
    report_status_id: updated.report_status_id,
    content_type:
      updated.content_type === "post" || updated.content_type === "comment"
        ? updated.content_type
        : "post",
    additional_details: updated.additional_details ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
