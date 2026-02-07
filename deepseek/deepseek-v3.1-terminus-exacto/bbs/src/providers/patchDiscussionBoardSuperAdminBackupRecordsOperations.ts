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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminBackupRecordsOperations(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardBackupRecord.IRequest;
}): Promise<IPageIDiscussionBoardBackupRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput: Prisma.discussion_board_backup_recordsWhereInput = {
    deleted_at: null,
    ...(props.body.backup_type && { backup_type: props.body.backup_type }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.initiated_by_admin_id && {
      initiated_by_admin_id: props.body.initiated_by_admin_id,
    }),
    ...(props.body.started_at_from && {
      started_at: {
        gte: props.body.started_at_from,
      },
    }),
    ...(props.body.started_at_to && {
      started_at: {
        lte: props.body.started_at_to,
      },
    }),
    ...(props.body.completed_at_from && {
      completed_at: {
        gte: props.body.completed_at_from,
      },
    }),
    ...(props.body.completed_at_to && {
      completed_at: {
        lte: props.body.completed_at_to,
      },
    }),
    ...(props.body.search && {
      OR: [
        {
          error_message: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          backup_type: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          status: { contains: props.body.search, mode: "insensitive" as const },
        },
      ],
    }),
  };
  // Handle sort
  const orderByInput: Prisma.discussion_board_backup_recordsOrderByWithRelationInput =
    props.body.sort === "completed_at"
      ? { completed_at: "desc" }
      : props.body.sort === "backup_type"
        ? { backup_type: "asc" }
        : props.body.sort === "status"
          ? { status: "asc" }
          : { started_at: "desc" };
  // Get data with pagination
  const data = await MyGlobal.prisma.discussion_board_backup_records.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    include: {
      initiatedByAdmin: {
        select: {
          id: true,
          email: true,
          display_name: true,
          created_at: true,
        },
      },
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_backup_records.count({
    where: whereInput,
  });
  // Transform data to DTO format
  const transformedData = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    backup_type: record.backup_type,
    status: record.status,
    size_bytes: record.size_bytes ?? 0,
    started_at: toISOStringSafe(record.started_at),
    completed_at: record.completed_at
      ? toISOStringSafe(record.completed_at)
      : null,
    created_at: toISOStringSafe(record.created_at),
    initiatedByAdmin: record.initiatedByAdmin
      ? {
          id: record.initiatedByAdmin.id as string & tags.Format<"uuid">,
          email: record.initiatedByAdmin.email as string & tags.Format<"email">,
          display_name: record.initiatedByAdmin.display_name,
          created_at: toISOStringSafe(record.initiatedByAdmin.created_at),
        }
      : {
          id: v4() as string & tags.Format<"uuid">,
          email: "unknown@system.local" as string & tags.Format<"email">,
          display_name: "System Administrator",
          created_at: toISOStringSafe(new Date()),
        },
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardBackupRecord.ISummary;
}
