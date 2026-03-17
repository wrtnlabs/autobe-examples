import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformContentReportAtSummaryTransformer } from "../transformers/CommunityPlatformContentReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminReportsStatistics(props: {
  admin: AdminPayload;
  body: ICommunityPlatformContentReport.IRequest;
}): Promise<IPageICommunityPlatformContentReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions
  const where: Prisma.community_platform_content_reportsWhereInput = {
    deleted_at: null,
  };
  // Status filter
  if (props.body.status && props.body.status.length > 0) {
    where.status = { in: props.body.status };
  }
  // Community filter
  if (props.body.community_id) {
    where.community_id = props.body.community_id;
  }
  // Reporter filter
  if (props.body.reporter_member_id) {
    where.reporter_member_id = props.body.reporter_member_id;
  }
  // Date range filters - Date constructor is allowed for Prisma queries
  if (props.body.created_after) {
    const createdAfter = new Date(props.body.created_after);
    where.created_at = {
      gte: createdAfter,
    };
  }
  if (props.body.created_before) {
    const createdBefore = new Date(props.body.created_before);
    where.created_at = {
      ...(where.created_at as Prisma.DateTimeFilter),
      lte: createdBefore,
    };
  }
  // Text search
  if (props.body.search) {
    where.reason = {
      contains: props.body.search,
      mode: "insensitive" as const,
    };
  }
  // Content type filter - database-level filtering
  if (props.body.content_type === "post") {
    where.postReport = {
      isNot: null,
    };
  } else if (props.body.content_type === "comment") {
    where.commentReport = {
      isNot: null,
    };
  }
  // First, get count for pagination
  const total = await MyGlobal.prisma.community_platform_content_reports.count({
    where,
  });
  // Fetch paginated data
  const data =
    await MyGlobal.prisma.community_platform_content_reports.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...CommunityPlatformContentReportAtSummaryTransformer.select(),
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformContentReportAtSummaryTransformer.transform,
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
