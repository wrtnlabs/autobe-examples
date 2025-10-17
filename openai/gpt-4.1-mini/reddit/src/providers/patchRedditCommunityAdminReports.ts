import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminReports(props: {
  admin: AdminPayload;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const { admin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const skip = (page - 1) * limit;

  const where: Prisma.reddit_community_reportsWhereInput = {
    deleted_at: null,
    ...(body.status_id !== undefined &&
      body.status_id !== null && {
        status_id: body.status_id,
      }),
    ...(body.category !== undefined &&
      body.category !== null && {
        category: body.category,
      }),
    ...(body.reporter_member_id !== undefined &&
      body.reporter_member_id !== null && {
        reporter_member_id: body.reporter_member_id,
      }),
    ...(body.reported_post_id !== undefined &&
      body.reported_post_id !== null && {
        reported_post_id: body.reported_post_id,
      }),
    ...(body.reported_comment_id !== undefined &&
      body.reported_comment_id !== null && {
        reported_comment_id: body.reported_comment_id,
      }),
    ...(body.reported_member_id !== undefined &&
      body.reported_member_id !== null && {
        reported_member_id: body.reported_member_id,
      }),
  };

  const sort_order = body.order === "asc" ? "asc" : "desc";
  const sort_field = body.sort_by ?? "created_at";

  const [reports, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_reports.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort_field]: sort_order },
    }),
    MyGlobal.prisma.reddit_community_reports.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: reports.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      category: item.category,
      created_at: toISOStringSafe(item.created_at),
      status_id: item.status_id as string & tags.Format<"uuid">,
    })),
  };
}
