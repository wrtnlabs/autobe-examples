import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportReason";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformReportReasons(props: {
  body: ICommunityPlatformReportReason.IRequest;
}): Promise<IPageICommunityPlatformReportReason.ISummary> {
  // Pagination parameters do not exist on IRequest, so use defaults
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_platform_report_reasons.findMany(
    {
      where: { deleted_at: null },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    },
  );
  const total = await MyGlobal.prisma.community_platform_report_reasons.count({
    where: { deleted_at: null },
  });
  return {
    data: data.map((reason) => ({
      ...reason,
      created_at: reason.created_at ? toISOStringSafe(reason.created_at) : null,
      updated_at: reason.updated_at ? toISOStringSafe(reason.updated_at) : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
