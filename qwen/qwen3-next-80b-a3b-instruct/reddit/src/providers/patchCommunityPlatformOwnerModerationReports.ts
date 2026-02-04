import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { CommunityPlatformReportAtSummaryTransformer } from "../transformers/CommunityPlatformReportAtSummaryTransformer";

export async function patchCommunityPlatformOwnerModerationReports(props: {
  owner: OwnerPayload;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions
  let finalWhere: Prisma.community_platform_reportsWhereInput;
  if (props.body.target_type === "post") {
    finalWhere = {
      status: props.body.status,
      // Only report that has a post and the post is not deleted
      post: {
        deleted_at: null,
      },
    };
  } else if (props.body.target_type === "comment") {
    finalWhere = {
      status: props.body.status,
      // Only report that has a comment and the comment is not deleted
      comment: {
        deleted_at: null,
      },
    };
  } else {
    // This should never happen due to input validation, but for safety
    finalWhere = {
      status: props.body.status,
    };
  }
  // Query data with transformer's select (this ensures we get all fields needed by transformer)
  const data = await MyGlobal.prisma.community_platform_reports.findMany({
    where: finalWhere,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...CommunityPlatformReportAtSummaryTransformer.select(),
  });
  // Count total records (using same where conditions)
  const total = await MyGlobal.prisma.community_platform_reports.count({
    where: finalWhere,
  });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformReportAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
