import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBackupRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardBackupRecordAtSummaryTransformer } from "../transformers/DiscussionBoardBackupRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminBackupRecords(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardBackupRecord.IRequest;
}): Promise<IPageIDiscussionBoardBackupRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper date handling
  const whereInput = {
    deleted_at: null,
    ...(props.body.backup_type && { backup_type: props.body.backup_type }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.initiated_by_admin_id && {
      initiated_by_admin_id: props.body.initiated_by_admin_id,
    }),
    ...(props.body.started_at_from && {
      started_at: { gte: new Date(props.body.started_at_from) },
    }),
    ...(props.body.started_at_to && {
      started_at: { lte: new Date(props.body.started_at_to) },
    }),
    ...(props.body.completed_at_from && {
      completed_at: { gte: new Date(props.body.completed_at_from) },
    }),
    ...(props.body.completed_at_to && {
      completed_at: { lte: new Date(props.body.completed_at_to) },
    }),
    ...(props.body.search && {
      OR: [
        { error_message: { contains: props.body.search, mode: "insensitive" } },
        { backup_type: { contains: props.body.search, mode: "insensitive" } },
        { status: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
  } satisfies Prisma.discussion_board_backup_recordsWhereInput;
  // Determine sorting
  const orderByInput = (
    props.body.sort === "completed_at"
      ? { completed_at: "desc" as const }
      : props.body.sort === "backup_type"
        ? { backup_type: "asc" as const }
        : props.body.sort === "status"
          ? { status: "asc" as const }
          : { started_at: "desc" as const }
  ) satisfies Prisma.discussion_board_backup_recordsOrderByWithRelationInput;
  // Get paginated data
  const data = await MyGlobal.prisma.discussion_board_backup_records.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardBackupRecordAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_backup_records.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardBackupRecordAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
