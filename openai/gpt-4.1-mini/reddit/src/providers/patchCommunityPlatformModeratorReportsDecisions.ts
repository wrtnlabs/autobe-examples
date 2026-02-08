import { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportDecision";
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

export async function patchCommunityPlatformModeratorReportsDecisions(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformReportDecision.IRequest;
}): Promise<IPageICommunityPlatformReportDecision.ISummary> {
  const whereInput: Prisma.community_platform_reports_decisionsWhereInput = {
    deleted_at: null,
  };
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const orderByInput: Prisma.community_platform_reports_decisionsOrderByWithRelationInput =
    {
      created_at: "desc",
    };
  const data =
    await MyGlobal.prisma.community_platform_reports_decisions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        report_id: true,
        moderator_id: true,
        comments: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        decision: true,
      },
    });
  const total =
    await MyGlobal.prisma.community_platform_reports_decisions.count({
      where: whereInput,
    });
  return {
    data: data.map(
      (record): ICommunityPlatformReportDecision.ISummary => ({
        id: record.id,
        report_id: record.report_id,
        moderator_id: record.moderator_id,
        status: record.decision,
        comment: record.comments === null ? null : record.comments,
        created_at: toISOStringSafe(record.created_at),
        updated_at: toISOStringSafe(record.updated_at),
        deleted_at:
          record.deleted_at === null
            ? null
            : toISOStringSafe(record.deleted_at),
      }),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
