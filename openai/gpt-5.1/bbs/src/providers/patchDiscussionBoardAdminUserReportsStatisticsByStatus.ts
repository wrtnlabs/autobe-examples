import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReportByStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportByStatusStatistics";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchDiscussionBoardAdminUserReportsStatisticsByStatus(props: {
  adminUser: AdminuserPayload;
  body: IDiscussionBoardReportByStatusStatistics.IRequest;
}): Promise<IDiscussionBoardReportByStatusStatistics> {
  const filters = props.body;

  const where = {
    ...(filters.createdAtFrom !== undefined || filters.createdAtTo !== undefined
      ? {
          created_at: {
            ...(filters.createdAtFrom !== undefined
              ? { gte: new Date(filters.createdAtFrom) }
              : {}),
            ...(filters.createdAtTo !== undefined
              ? { lte: new Date(filters.createdAtTo) }
              : {}),
          },
        }
      : {}),
    ...(filters.updatedAtFrom !== undefined || filters.updatedAtTo !== undefined
      ? {
          updated_at: {
            ...(filters.updatedAtFrom !== undefined
              ? { gte: new Date(filters.updatedAtFrom) }
              : {}),
            ...(filters.updatedAtTo !== undefined
              ? { lte: new Date(filters.updatedAtTo) }
              : {}),
          },
        }
      : {}),
    ...(filters.targetTypes !== undefined && filters.targetTypes.length > 0
      ? { target_type: { in: filters.targetTypes } }
      : {}),
    ...(filters.reporterTypes !== undefined && filters.reporterTypes.length > 0
      ? { reporter_type: { in: filters.reporterTypes } }
      : {}),
    ...(filters.reasonCodes !== undefined && filters.reasonCodes.length > 0
      ? { reason_code: { in: filters.reasonCodes } }
      : {}),
    ...(filters.actions !== undefined && filters.actions.length > 0
      ? { action: { in: filters.actions } }
      : {}),
    ...(filters.statuses !== undefined && filters.statuses.length > 0
      ? { status: { in: filters.statuses } }
      : {}),
  };

  const [grouped, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_reports.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    MyGlobal.prisma.discussion_board_reports.count({ where }),
  ]);

  if (totalCount === 0 || grouped.length === 0) {
    return {
      items: [],
    };
  }

  const items = grouped
    .map((row) => {
      const count = row._count._all;
      const ratio = totalCount > 0 ? count / totalCount : undefined;
      const item: IDiscussionBoardReportByStatusStatistics.IItem = {
        status: row.status,
        count,
      };

      if (ratio !== undefined) {
        item.ratio = ratio;
      }

      return item;
    })
    .sort((a, b) => {
      if (a.status < b.status) return -1;
      if (a.status > b.status) return 1;
      return 0;
    });

  return {
    items,
  };
}
