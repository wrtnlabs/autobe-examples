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

export async function getRedditCommunityModeratorContentReportsContentReportId(props: {
  moderator: ModeratorPayload;
  contentReportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityContentReport> {
  const { contentReportId } = props;
  const record =
    await MyGlobal.prisma.reddit_community_content_reports.findUniqueOrThrow({
      where: { id: contentReportId },
    });

  return {
    id: record.id,
    reporter_id: record.reporter_id,
    content_id: record.content_id,
    report_reason_id: record.report_reason_id,
    report_status_id: record.report_status_id,
    content_type: record.content_type === "post" ? "post" : "comment",
    additional_details: record.additional_details ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
