import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBackupRecord";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminBackupRecords(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardBackupRecord.IRequest;
}): Promise<IPageIDiscussionBoardBackupRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.discussion_board_backup_recordsWhereInput = {
    deleted_at: null,
    ...(props.body.backup_type && { backup_type: props.body.backup_type }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.initiated_by_admin_id && {
      initiated_by_admin_id: props.body.initiated_by_admin_id,
    }),
    ...(props.body.started_at_after && {
      started_at: {
        gte: new Date(props.body.started_at_after),
      },
    }),
    ...(props.body.completed_at_before && {
      completed_at: {
        lte: new Date(props.body.completed_at_before),
      },
    }),
  } satisfies Prisma.discussion_board_backup_recordsWhereInput;
  const data = await MyGlobal.prisma.discussion_board_backup_records.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { started_at: "desc" as const },
    include: {
      initiatedByAdmin: {
        select: {
          id: true,
          email: true,
          display_name: true,
          created_at: true,
        } satisfies Prisma.discussion_board_adminsSelect,
      },
    },
  });
  const total = await MyGlobal.prisma.discussion_board_backup_records.count({
    where: whereClause,
  });
  const transformedData = data.map((record) => {
    const initiatedByAdmin = record.initiatedByAdmin
      ? ({
          id: record.initiatedByAdmin.id,
          email: record.initiatedByAdmin.email,
          display_name: record.initiatedByAdmin.display_name,
          created_at: toISOStringSafe(record.initiatedByAdmin.created_at),
        } satisfies IDiscussionBoardAdmin.ISummary)
      : null;
    const summary: IDiscussionBoardBackupRecord.ISummary = {
      id: record.id,
      backup_type: record.backup_type,
      status: record.status,
      size_bytes: record.size_bytes === null ? undefined : record.size_bytes,
      started_at: toISOStringSafe(record.started_at),
      completed_at: record.completed_at
        ? toISOStringSafe(record.completed_at)
        : undefined,
      initiated_by_admin: initiatedByAdmin,
    };
    return summary;
  });
  const result: IPageIDiscussionBoardBackupRecord.ISummary = {
    pagination: {
      pagination: {
        pagination: {
          pagination: {
            current: page,
            limit: limit,
            records: total,
            pages: total === 0 ? 0 : Math.ceil(total / limit),
          } satisfies IPage.IPagination,
          data: [],
        } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
        data: [],
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
      data: [],
    } satisfies IPageIDiscussionBoardSection.IPagination,
    data: transformedData,
  };
  return result;
}
