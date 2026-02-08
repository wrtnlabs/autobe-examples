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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserCommentReports(props: {
  user: UserPayload;
  body: ICommunityPlatformCommentReport.IRequest;
}): Promise<IPageICommunityPlatformCommentReport.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.community_platform_comment_reports.findMany({
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
  const total =
    await MyGlobal.prisma.community_platform_comment_reports.count();
  return {
    data: data.map((report) => ({
      id: report.id,
      status: report.status,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
      reporter_user_id: report.reporter_user_id,
      report_reason_id: report.report_reason_id ?? null,
      comment_id: report.comment_id,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
