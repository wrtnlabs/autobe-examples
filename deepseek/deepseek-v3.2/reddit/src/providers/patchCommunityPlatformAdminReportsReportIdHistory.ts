import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";
import { ICommunityPlatformUserReportHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReportHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformUserReportHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserReportHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformUserReportHistoryAtSummaryTransformer } from "../transformers/CommunityPlatformUserReportHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminReportsReportIdHistory(props: {
  admin: AdminPayload;
  reportId: string;
}): Promise<IPageICommunityPlatformUserReportHistory.ISummary> {
  // 1. Verify admin exists and is active
  await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
    where: { id: props.admin.id, deleted_at: null },
  });
  // 2. Verify report exists and is not soft-deleted
  const report =
    await MyGlobal.prisma.community_platform_user_reports.findUniqueOrThrow({
      where: { id: props.reportId, deleted_at: null },
    });
  // 3. Setup pagination with default values
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // 4. Query audit history with proper JOIN
  const data =
    await MyGlobal.prisma.community_platform_user_report_histories.findMany({
      where: {
        user_report_id: props.reportId,
        userReport: { deleted_at: null },
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformUserReportHistoryAtSummaryTransformer.select(),
    });
  // 5. Get total count
  const total =
    await MyGlobal.prisma.community_platform_user_report_histories.count({
      where: {
        user_report_id: props.reportId,
        userReport: { deleted_at: null },
      },
    });
  // 6. Transform data
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformUserReportHistoryAtSummaryTransformer.transform,
  );
  // 7. Return paginated response
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
