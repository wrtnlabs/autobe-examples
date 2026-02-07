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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityModeratorReports(props: {
  moderator: ModeratorPayload;
}): Promise<IPageICommunityReport> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const reports = await MyGlobal.prisma.community_reports.findMany({
    where: {},
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      reporter_id: true,
      reported_content_id: true,
      content_type: true,
      reason: true,
      created_at: true,
      updated_at: true,
      status: true,
    },
  });
  const total = await MyGlobal.prisma.community_reports.count({});
  return {
    data: reports.map((r) => ({
      id: r.id,
      reporter_id: r.reporter_id,
      reported_content_id: r.reported_content_id,
      content_type: r.content_type,
      reason: r.reason,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      status: r.status,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
