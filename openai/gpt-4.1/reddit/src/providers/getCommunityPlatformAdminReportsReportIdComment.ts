import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReportOfComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComments";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminReportsReportIdComment(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportOfComments> {
  const record =
    await MyGlobal.prisma.community_platform_report_of_comments.findFirst({
      where: { report_id: props.reportId },
    });
  if (!record) throw new HttpException("Reported comment not found", 404);
  return {
    id: record.id,
    report_id: record.report_id,
    target_comment_id: record.target_comment_id,
    created_at: toISOStringSafe(record.created_at),
  };
}
