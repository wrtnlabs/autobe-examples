import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReportStatisticsByTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatisticsByTarget";
import { IDiscussionBoardReportStatisticsByTargetBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatisticsByTargetBucket";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchDiscussionBoardAdminUserReportsStatisticsByTarget(props: {
  adminUser: AdminuserPayload;
  body: IDiscussionBoardReportStatisticsByTarget.IRequest;
}): Promise<IDiscussionBoardReportStatisticsByTarget> {
  const baseWhere = (() => {
    const body = props.body;

    const createdAtCondition = (() => {
      if (body.createdAtFrom === undefined && body.createdAtTo === undefined) {
        return {};
      }

      const range: {
        gte?: string;
        lt?: string;
      } = {};

      if (body.createdAtFrom !== undefined) {
        range.gte = body.createdAtFrom;
      }

      if (body.createdAtTo !== undefined) {
        range.lt = body.createdAtTo;
      }

      return { created_at: range };
    })();

    const statusCondition =
      body.statusList !== undefined && body.statusList.length > 0
        ? { status: { in: body.statusList } }
        : {};

    const actionCondition =
      body.actionList !== undefined && body.actionList.length > 0
        ? { action: { in: body.actionList } }
        : {};

    const reasonCodeCondition =
      body.reasonCodeList !== undefined && body.reasonCodeList.length > 0
        ? { reason_code: { in: body.reasonCodeList } }
        : {};

    return {
      ...createdAtCondition,
      ...statusCondition,
      ...actionCondition,
      ...reasonCodeCondition,
    };
  })();

  const [totalByTarget, resolvedByTarget, openByTarget] = await Promise.all([
    MyGlobal.prisma.discussion_board_reports.groupBy({
      by: ["target_type"],
      where: baseWhere,
      _count: { _all: true },
    }),
    MyGlobal.prisma.discussion_board_reports.groupBy({
      by: ["target_type"],
      where: {
        ...baseWhere,
        status: {
          equals: "resolved",
        },
      },
      _count: { _all: true },
    }),
    MyGlobal.prisma.discussion_board_reports.groupBy({
      by: ["target_type"],
      where: {
        ...baseWhere,
        status: {
          not: "resolved",
        },
      },
      _count: { _all: true },
    }),
  ]);

  const resolvedMap = resolvedByTarget.reduce(
    (acc, row) => {
      const next: { [targetType: string]: number } = {};

      for (const key in acc) {
        next[key] = acc[key];
      }

      next[row.target_type] = row._count._all;
      return next;
    },
    {} as { [targetType: string]: number },
  );

  const openMap = openByTarget.reduce(
    (acc, row) => {
      const next: { [targetType: string]: number } = {};

      for (const key in acc) {
        next[key] = acc[key];
      }

      next[row.target_type] = row._count._all;
      return next;
    },
    {} as { [targetType: string]: number },
  );

  const buckets: IDiscussionBoardReportStatisticsByTargetBucket[] =
    totalByTarget.map((row) => {
      const targetType = row.target_type;
      const totalReportCount = row._count._all;
      const resolvedReportCount =
        resolvedMap[targetType] !== undefined ? resolvedMap[targetType] : 0;
      const openReportCount =
        openMap[targetType] !== undefined ? openMap[targetType] : 0;

      return {
        targetType,
        totalReportCount,
        openReportCount,
        resolvedReportCount,
      };
    });

  return { buckets };
}
