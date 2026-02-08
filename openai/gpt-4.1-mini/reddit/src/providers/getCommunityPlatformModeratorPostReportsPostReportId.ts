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

export async function getCommunityPlatformModeratorPostReportsPostReportId(props: {
  moderator: ModeratorPayload;
  postReportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostReport> {
  const record =
    await MyGlobal.prisma.community_platform_post_reports.findUnique({
      where: { id: props.postReportId },
      select: {
        id: true,
        community_platform_user_id: true,
        community_platform_post_id: true,
        status: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record || record.deleted_at !== null) {
    throw new HttpException("Post report not found", 404);
  }
  const toDateTimeString = (
    date: Date | null,
  ): (string & tags.Format<"date-time">) | null =>
    date === null ? null : toISOStringSafe(date);
  return {
    id: record.id,
    reported_user_id: record.community_platform_user_id,
    reported_post_id: record.community_platform_post_id,
    report_reason_id: null,
    status: record.status,
    created_at: toDateTimeString(record.created_at),
    updated_at: toDateTimeString(record.updated_at),
    deleted_at: toDateTimeString(record.deleted_at),
    reporter: null,
    post: null,
    report_reason: {
      id: null,
      text: record.reason,
    },
  };
}
