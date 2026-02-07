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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberReports(props: {
  member: MemberPayload;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  const pageSize = Math.min(props.body.size || 20, 100);
  const where = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.category_id && {
      report_categories_id: props.body.category_id,
    }),
    ...(props.body.reported_content_type && {
      reported_content_type: props.body.reported_content_type,
    }),
    ...(props.body.reporter_id && { members_id: props.body.reporter_id }),
  };
  const whereWithCursor = props.body.cursor
    ? { ...where, id: { gt: props.body.cursor } }
    : where;
  const orderBy =
    props.body.sort_by === "recent"
      ? [{ created_at: "desc" as Prisma.SortOrder }]
      : [
          {
            status: "asc" as Prisma.SortOrder,
          },
          { created_at: "desc" as Prisma.SortOrder },
        ];
  const data = await MyGlobal.prisma.community_platform_reports.findMany({
    where: whereWithCursor,
    orderBy,
    take: pageSize,
  });
  const total = await MyGlobal.prisma.community_platform_reports.count({
    where,
  });
  return {
    pagination: {
      current: props.body.cursor ? 2 : 1,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: [],
  };
}
