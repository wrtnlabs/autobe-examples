import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorAuditLogs(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereClause = { deleted_at: null };
  const total = await MyGlobal.prisma.discussion_board_audit_logs.count({
    where: whereClause,
  });
  const records = await MyGlobal.prisma.discussion_board_audit_logs.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      event_type: true,
      event_description: true,
      actor_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      event_type: record.event_type,
      event_description: record.event_description,
      actor_id: record.actor_id === null ? undefined : record.actor_id,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
