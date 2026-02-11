import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformReportTransformer } from "../transformers/RedditPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminRedditPlatformReports(props: {
  admin: AdminPayload;
  body: IRedditPlatformReport.IRequest;
}): Promise<IPageIRedditPlatformReport> {
  const page = props.body.page ?? 1;
  const limit = props.body.pageSize ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const where: Prisma.reddit_platform_reportsWhereInput = {};
  // Status filter
  if (props.body.status) {
    const validStatuses = ["PENDING", "APPROVED", "DISMISSED"] as const;
    const status = props.body.status as string;
    if ((validStatuses as readonly string[]).includes(status)) {
      where.status = status as "PENDING" | "APPROVED" | "DISMISSED";
    }
  }
  // Reporter ID filter
  if (props.body.reporterId) {
    where.reporter_id = props.body.reporterId;
  }
  // Reported type filter
  if (props.body.reportedType) {
    const validTypes = ["POST", "COMMENT"] as const;
    const type = props.body.reportedType as string;
    if ((validTypes as readonly string[]).includes(type)) {
      where.reported_type = type as "POST" | "COMMENT";
    }
  }
  // Reported ID filter
  if (props.body.reportedId) {
    where.reported_id = props.body.reportedId;
  }
  // Date range filters
  if (props.body.startDate) {
    where.created_at = {
      gte: props.body.startDate,
    };
  }
  if (props.body.endDate) {
    where.created_at = {
      lt: props.body.endDate,
    };
  }
  // Sort order
  const orderBy: Prisma.reddit_platform_reportsOrderByWithRelationInput =
    props.body.sortBy === "created_at" && props.body.sortOrder === "ASC"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  // Execute paginated query
  const data = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...RedditPlatformReportTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_reports.count({
    where,
  });
  // Transform results
  const transformedData = await Promise.all(
    data.map(RedditPlatformReportTransformer.transform),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
  };
}
