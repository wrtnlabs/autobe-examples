import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
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

export async function getCommunityPlatformAdminReportsPending(props: {
  admin: AdminPayload;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  try {
    const reports = await MyGlobal.prisma.community_platform_reports.findMany({
      where: { status: "pending" },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });
    const total = await MyGlobal.prisma.community_platform_reports.count({
      where: { status: "pending" },
    });
    const data = reports.map((report) => ({
      id: report.id,
      status: report.status,
      created_at: toISOStringSafe(report.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(report.updated_at) as string &
        tags.Format<"date-time">,
    }));
    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data,
    };
  } catch {
    throw new HttpException("Failed to fetch pending reports", 500);
  }
}
