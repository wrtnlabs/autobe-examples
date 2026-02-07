import { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformReportCategoryAtSummaryTransformer } from "../transformers/CommunityPlatformReportCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformReportCategories(props: {
  body: ICommunityPlatformReportCategory.IRequest;
}): Promise<IPageICommunityPlatformReportCategory.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.community_platform_report_categories.findMany({
      where: { deleted_at: null },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformReportCategoryAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_report_categories.count({
      where: { deleted_at: null },
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformReportCategoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } as IPage.IPagination,
  } as IPageICommunityPlatformReportCategory.ISummary;
}
