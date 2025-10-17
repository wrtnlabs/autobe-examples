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
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function patchRedditCommunityCommunityModeratorReports(props: {
  communityModerator: CommunitymoderatorPayload;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const allowedSortFields = new Set(["id", "category", "created_at"]);
  const sortBy =
    body.sort_by && allowedSortFields.has(body.sort_by)
      ? body.sort_by
      : "created_at";
  const order = (body.order === "asc" ? "asc" : "desc") as "asc" | "desc";

  const where = {
    deleted_at: null,
    ...(body.status_id !== undefined &&
      body.status_id !== null && { status_id: body.status_id }),
    ...(body.category !== undefined &&
      body.category !== null && { category: { contains: body.category } }),
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

  const [reports, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_reports.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        category: true,
        created_at: true,
        status_id: true,
      },
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
    data: reports.map((report) => ({
      id: report.id as string & tags.Format<"uuid">,
      category: report.category,
      created_at: toISOStringSafe(report.created_at),
      status_id: report.status_id as string & tags.Format<"uuid">,
    })),
  };
}
