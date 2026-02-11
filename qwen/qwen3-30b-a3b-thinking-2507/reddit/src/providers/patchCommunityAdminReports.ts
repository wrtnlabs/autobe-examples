import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityReportAtSummaryTransformer } from "../transformers/CommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdminReports(props: {
  admin: AdminPayload;
  body: ICommunityReport.IRequest;
}): Promise<IPageICommunityReport.ISummary> {
  const { page = 1, limit = 20, status, reason } = props.body;
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;
  const whereInput: Prisma.community_reportsWhereInput = {
    deleted_at: null,
    ...(status !== undefined ? { status: { equals: status } } : {}),
    ...(reason && reason.length >= 5 ? { reason: { contains: reason } } : {}),
  };
  const data = await MyGlobal.prisma.community_reports.findMany({
    where: whereInput,
    skip,
    take: safeLimit,
    orderBy: { created_at: "desc" },
    ...CommunityReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_reports.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityReportAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    },
  };
}
