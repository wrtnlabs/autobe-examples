import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageICommunityBBSComplianceAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSComplianceAlert";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBBSComplianceAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSComplianceAlert";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityBBSAdminDashboardComplianceAlerts(props: {
  admin: AdminPayload;
}): Promise<IPageICommunityBBSComplianceAlert.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  const [alerts, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_reports.findMany({
      where: {
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      include: {
        reason: true,
      },
    }),
    MyGlobal.prisma.community_bbs_reports.count({
      where: {
        deleted_at: null,
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: alerts.map((alert) => alert.reason.description || alert.reason.name),
  };
}
