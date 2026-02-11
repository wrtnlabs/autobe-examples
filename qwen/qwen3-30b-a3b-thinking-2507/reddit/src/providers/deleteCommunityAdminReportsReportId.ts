import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const report = await MyGlobal.prisma.community_reports.findUnique({
    where: { id: props.reportId },
    select: {
      community_post_id: true,
      community_comment_id: true,
    },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  const communityId = report.community_post_id
    ? report.community_post_id
    : report.community_comment_id;
  if (!communityId) {
    throw new HttpException("Invalid report structure", 500);
  }
  const isModerator = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: communityId,
      member_id: props.admin.id,
    },
  });
  if (!isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_reports.delete({
    where: { id: props.reportId },
  });
}
