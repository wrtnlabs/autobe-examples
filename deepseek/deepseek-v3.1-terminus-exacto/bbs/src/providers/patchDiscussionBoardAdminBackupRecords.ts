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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBackupRecordAtSummaryTransformer } from "../transformers/DiscussionBoardBackupRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminBackupRecords(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBackupRecord.IRequest;
}): Promise<IPageIDiscussionBoardBackupRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build comprehensive WHERE clause
  const whereInput = {
    deleted_at: null,
    ...(props.body.backup_type && { backup_type: props.body.backup_type }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.initiated_by_admin_id !== undefined && {
      initiated_by_admin_id: props.body.initiated_by_admin_id,
    }),
    ...(props.body.started_at_after && {
      started_at: { gte: new Date(props.body.started_at_after) },
    }),
    ...(props.body.completed_at_before && {
      OR: [
        { completed_at: { lte: new Date(props.body.completed_at_before) } },
        { completed_at: null },
      ],
    }),
  } satisfies Prisma.discussion_board_backup_recordsWhereInput;
  // Execute queries sequentially (not in parallel) as per Realize Coder pattern
  const data = await MyGlobal.prisma.discussion_board_backup_records.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { started_at: "desc" },
    ...DiscussionBoardBackupRecordAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_backup_records.count({
    where: whereInput,
  });
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardBackupRecordAtSummaryTransformer.transform,
  );
  // Create the correct pagination structure
  const pagination: IPage.IPagination = {
    current: page satisfies number as number,
    limit: limit satisfies number as number,
    records: total satisfies number as number,
    pages: Math.ceil(total / limit) satisfies number as number,
  };
  return {
    pagination: {
      pagination: {
        pagination: {
          pagination: pagination,
          data: [],
        } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
        data: [],
      } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
      data: [],
    } satisfies IPageIDiscussionBoardSection.IPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardBackupRecord.ISummary;
}
