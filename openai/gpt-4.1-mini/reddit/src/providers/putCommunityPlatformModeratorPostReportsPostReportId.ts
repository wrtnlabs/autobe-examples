import { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
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

export async function putCommunityPlatformModeratorPostReportsPostReportId(props: {
  moderator: ModeratorPayload;
  postReportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostReport.IUpdate;
}): Promise<ICommunityPlatformPostReport> {
  const allowedStatuses = ["pending", "approved", "dismissed"] as const;
  if (
    "status" in props.body &&
    props.body.status !== undefined &&
    !allowedStatuses.includes(
      props.body.status as (typeof allowedStatuses)[number],
    )
  ) {
    throw new HttpException(`Invalid status: ${props.body.status}`, 400);
  }
  const existing =
    await MyGlobal.prisma.community_platform_post_reports.findUnique({
      where: { id: props.postReportId },
    });
  if (!existing) throw new HttpException("Post report not found", 404);
  const data: {
    reason?: string | null;
    status?: (typeof allowedStatuses)[number];
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if ("reason" in props.body) {
    data.reason = props.body.reason === null ? null : props.body.reason;
  }
  if ("status" in props.body) {
    data.status = props.body.status as (typeof allowedStatuses)[number];
  }
  const updated = await MyGlobal.prisma.community_platform_post_reports.update({
    where: { id: props.postReportId },
    data: data as Prisma.community_platform_post_reportsUpdateInput,
  });
  return updated;
}
