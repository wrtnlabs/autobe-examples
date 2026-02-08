import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";
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

export async function patchCommunityPlatformModeratorCommentReports(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommentReport.IRequest;
}): Promise<IPageICommunityPlatformCommentReport.ISummary> {
  // Since IRequest is empty, no filtering or pagination available; use defaults
  const page = 1;
  const limit = 20;
  const skip = 0;
  // Query data without filtering
  const data =
    await MyGlobal.prisma.community_platform_comment_reports.findMany({
      where: { deleted_at: null },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        reporter_user_id: true,
        report_reason_id: true,
        comment_id: true,
      },
    });
  // Count total records
  const total = await MyGlobal.prisma.community_platform_comment_reports.count({
    where: { deleted_at: null },
  });
  // Map to summary DTO
  const records: ICommunityPlatformCommentReport.ISummary[] = data.map(
    (record) => ({
      id: record.id,
      status: record.status,
      created_at: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(record.updated_at) as string &
        tags.Format<"date-time">,
      comment_id: record.comment_id,
      reporter_user: null,
      report_reason: null,
    }),
  );
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: records,
  };
}
