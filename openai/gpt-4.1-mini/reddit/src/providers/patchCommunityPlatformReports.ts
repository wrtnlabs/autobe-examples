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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformReports(props: {
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  const page =
    typeof (props.body as any).page === "number" && (props.body as any).page > 0
      ? (props.body as any).page
      : 1;
  const limit =
    typeof (props.body as any).limit === "number" &&
    (props.body as any).limit > 0
      ? (props.body as any).limit
      : 10;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
  } satisfies Prisma.community_platform_reportsWhereInput;
  // Query total count of matching reports
  const total = await MyGlobal.prisma.community_platform_reports.count({
    where: whereInput,
  });
  // Query paginated report records with related reason, user info, and reported contents
  const records = await MyGlobal.prisma.community_platform_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      status: true,
      description: true,
      created_at: true,
      reportReason: {
        select: { reason_text: true },
      },
      user: {
        select: { id: true, display_name: true },
      },
      reportedContents: {
        select: {
          community_platform_reported_post_id: true,
          community_platform_reported_comment_id: true,
        },
      },
    },
  });
  // Transform each report record into summary format
  const data = records.map((record) => {
    const reported_post_ids = record.reportedContents
      .map((c) => c.community_platform_reported_post_id)
      .filter((id): id is string & tags.Format<"uuid"> => id !== null);
    const reported_comment_ids = record.reportedContents
      .map((c) => c.community_platform_reported_comment_id)
      .filter((id): id is string & tags.Format<"uuid"> => id !== null);
    return {
      id: record.id as string & tags.Format<"uuid">,
      status: record.status,
      description: record.description,
      created_at: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
      report_reason_text: record.reportReason?.reason_text ?? null,
      reporting_user_id: record.user.id as string & tags.Format<"uuid">,
      reporting_user_display_name: record.user.display_name,
      reported_post_ids,
      reported_comment_ids,
    };
  });
  return {
    data,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
